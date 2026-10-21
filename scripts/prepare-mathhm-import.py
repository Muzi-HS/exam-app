"""Build an offline import bundle; no network requests or DB writes."""
import argparse
import base64
import collections
import csv
import hashlib
import json
from pathlib import Path
import uuid
from urllib.parse import urlparse, parse_qs

parser = argparse.ArgumentParser()
parser.add_argument("directory", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
base = args.directory.resolve()
records = json.loads((base / "records.json").read_text(encoding="utf-8-sig"))
status = json.loads((base / "download_status.json").read_text(encoding="utf-8-sig"))
cutoffs = {"해석학": 59, "정수론": 25, "복소함수론": 27}
subjects = list(dict.fromkeys(row["subject"] for row in records))
topics = {subject: list(dict.fromkeys(unit for row in records if row["subject"] == subject for unit in row["units"])) for subject in subjects}
problems, report = [], []
for record in records:
    subject, number = record["subject"], record["number"]
    if number <= cutoffs.get(subject, 0):
        continue
    assert len(record["units"]) == 1, record
    unit = record["units"][0]  # Preserve all LaTeX delimiters and backslashes exactly.
    youtube = record.get("youtube_url") or ""
    if youtube:
        parsed = urlparse(youtube)
        assert parsed.scheme == "https" and parsed.hostname in ("www.youtube.com", "youtube.com", "youtu.be"), youtube
        assert parsed.hostname == "youtu.be" or parse_qs(parsed.query).get("v"), youtube
    images = {}
    for file in record["files"]:
        path = (base / file["path"]).resolve()
        assert path.is_relative_to(base), path
        data = path.read_bytes()
        assert data.startswith(b"\x89PNG\r\n\x1a\n"), path
        assert status[file["path"]]["status"] == "ok" and status[file["path"]]["bytes"] == len(data), path
        key = {"문제": "problem", "해설": "solution"}[file["kind"]]
        assert key not in images, record
        images[key] = dict(sha256=hashlib.sha256(data).hexdigest(), data=base64.b64encode(data).decode("ascii"))
    assert set(images) == {"problem", "solution"}, record
    problem_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"https://www.mathhm.com/import/{subject}/{number}"))
    image_ids = {kind: str(uuid.uuid5(uuid.UUID(problem_id), kind)) for kind in images}
    problems.append(dict(id=problem_id, title="정현민 전공수학", subject=subject, subject_order=subjects.index(subject),
                         unit=unit, unit_order=topics[subject].index(unit), problem_number=str(number), youtube_url=youtube,
                         images={kind: dict(id=image_ids[kind], **image) for kind, image in images.items()}))
    report.append(dict(subject=subject, unit=unit, number=number, title="정현민 전공수학", youtube_url=youtube,
                       problem_path=next(f["path"] for f in record["files"] if f["kind"] == "문제"),
                       solution_path=next(f["path"] for f in record["files"] if f["kind"] == "해설")))
assert len({problem["id"] for problem in problems}) == len(problems)
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(dict(version=1, kind="mathhm", cutoffs=cutoffs, problems=problems), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
with args.output.with_suffix(".csv").open("w", encoding="utf-8-sig", newline="") as stream:
    writer = csv.DictWriter(stream, fieldnames=list(report[0])); writer.writeheader(); writer.writerows(report)
print(json.dumps(dict(problems=len(problems), images=len(problems)*2, subjects=collections.Counter(problem["subject"] for problem in problems),
                      empty_youtube=sum(not problem["youtube_url"] for problem in problems), bytes=args.output.stat().st_size), ensure_ascii=False))
