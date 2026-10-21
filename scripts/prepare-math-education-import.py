"""Prepare a local, self-contained image import bundle without touching the DB."""
import argparse
import base64
import collections
import csv
import hashlib
import io
import json
from pathlib import Path
import uuid
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument("archive", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
seed = json.loads((Path(__file__).resolve().parents[1] / "supabase/past-exam-category-seed.json").read_text(encoding="utf-8"))
categories = []
for i, (root, groups) in enumerate(seed):
    rid = f"past-root-{i}"
    categories.append(dict(id=rid, parent_id=None, name=root, order_index=i))
    for j, (group, leaves) in enumerate(groups):
        gid = f"{rid}-{j}"
        categories.append(dict(id=gid, parent_id=rid, name=group, order_index=j))
        for k, leaf in enumerate(leaves):
            categories.append(dict(id=f"{gid}-{k}", parent_id=gid, name=leaf, order_index=k))
categories.append(dict(id="past-curriculum-general", parent_id="past-root-1", name="교육과정 일반", order_index=6))
by_name = {item["name"]: item["id"] for item in categories}
aliases = {"문제 제기": "문제제기", "공학 도구": "공학도구", "문제의 구성 요소": "문제의 구성요소", "딬즈": "딘즈"}
short_keywords = {"문제해결 전략(추론유형)": "추론유형", "문제해결 전략(발견술)": "발견술", "문제해결 전략(해결 전략)": "해결 전략"}
groups = collections.defaultdict(list)
with zipfile.ZipFile(args.archive) as archive:
    csv_name = next(name for name in archive.namelist() if name.endswith(".csv"))
    rows = list(csv.DictReader(io.StringIO(archive.read(csv_name).decode("utf-8-sig"))))
    for row in rows:
        groups[(row["학년도"], row["시험구분"], row["문항유형"], row["문항번호"])].append(row)
    problems = []
    report = []
    for (year, exam, kind, number), records in sorted(groups.items()):
        areas = [aliases.get(area.strip(), area.strip()) for area in records[0]["영역"].split("/")]
        notes = []
        if (year, exam, kind, number) == ("2003", "A", "regular", "3"):
            areas = ["문제해결 전략(발견술)", "쉐발라드"]
            notes.append("원본 이미지 검토: 폴리아의 발문과 교수학적 변환 내용에 맞춰 분류표를 보정했습니다.")
        category_id = next((by_name[area] for area in areas if area in by_name), "past-curriculum-general")
        if category_id == "past-curriculum-general":
            notes.append("원본 분류가 교육과정 일반으로 되어 있어 일반 분류에 배정했습니다.")
        keywords = list(dict.fromkeys(short_keywords.get(area, area) for area in areas))
        images = {"problem": [], "solution": []}
        missing = []
        ordered = sorted(records, key=lambda row: ({"문제": 0, "모범답안": 1, "해설": 2}[row["자료종류"]], row["파일경로"]))
        for row in ordered:
            path = row["파일경로"]
            if path not in archive.namelist():
                missing.append(path)
                continue
            data = archive.read(path)
            assert data.startswith(b"\x89PNG\r\n\x1a\n"), path
            target = "problem" if row["자료종류"] == "문제" else "solution"
            images[target].append(dict(name=Path(path).name, sha256=hashlib.sha256(data).hexdigest(), data=base64.b64encode(data).decode("ascii")))
        assert images["problem"], records[0]
        if not images["solution"]:
            notes.append("원본 ZIP에 모범답안·해설 이미지가 포함되어 있지 않습니다.")
        if missing:
            notes.append("원본 다운로드 누락: " + ", ".join(missing))
        title = f"{year} {exam} {'논술 ' if kind == 'essay' else ''}{int(number)}번"
        source_key = f"matheduforu:{year}:{exam}:{kind}:{int(number)}"
        problem = dict(id=str(uuid.uuid5(uuid.NAMESPACE_URL, source_key)), title=title, year=int(year), problem_number=str(int(number)),
                       category_id=category_id, keywords=keywords, memo="\n".join(notes), problem_images=images["problem"], solution_images=images["solution"])
        problems.append(problem)
        report.append(dict(title=title, number=number, category=next(c["name"] for c in categories if c["id"] == category_id), keywords=" / ".join(keywords),
                           problem_images=len(images["problem"]), solution_images=len(images["solution"]), review=" | ".join(notes)))
    assert len({problem["id"] for problem in problems}) == len(problems)
    assert len({problem["title"] for problem in problems}) == len(problems)
    assert sum(len(p["problem_images"]) + len(p["solution_images"]) for p in problems) == sum(name.endswith(".png") for name in archive.namelist())
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(dict(version=1, categories=categories, problems=problems), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
with args.output.with_suffix(".csv").open("w", encoding="utf-8-sig", newline="") as stream:
    writer = csv.DictWriter(stream, fieldnames=list(report[0]))
    writer.writeheader()
    writer.writerows(report)
print(json.dumps(dict(problems=len(problems), problem_images=sum(len(p["problem_images"]) for p in problems), solution_images=sum(len(p["solution_images"]) for p in problems), bundle_bytes=args.output.stat().st_size), ensure_ascii=False))
