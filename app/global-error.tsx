"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1rem",
            textAlign: "center",
            fontFamily: "sans-serif",
            backgroundColor: "#fafaf9",
            color: "#1c1c1f",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>문제가 발생했습니다</h1>
            <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "#6b6b6f" }}>
              앱을 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            style={{
              borderRadius: "6px",
              backgroundColor: "#1f3a5f",
              color: "#fafaf9",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
