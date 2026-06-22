// 좌측 사이드바(explorer 포함) 가로폭을 드래그로 조절한다.
// 폭은 CSS 변수 --left-sidebar-width 로 grid 좌측 컬럼에 반영되고, localStorage에 기억된다.
const STORAGE_KEY = "left-sidebar-width"
const MIN_WIDTH = 180
const MAX_WIDTH = 600

function applyWidth(px: number) {
  document.documentElement.style.setProperty("--left-sidebar-width", `${px}px`)
}

function setupSidebarResize() {
  const sidebar = document.querySelector(".sidebar.left") as HTMLElement | null
  if (!sidebar) return
  // SPA 네비게이션마다 nav가 발생하므로 핸들 중복 생성을 막는다.
  if (sidebar.querySelector(".sidebar-resize-handle")) return

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const w = parseInt(saved, 10)
    if (!Number.isNaN(w)) applyWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w)))
  }

  const handle = document.createElement("div")
  handle.className = "sidebar-resize-handle"
  handle.setAttribute("title", "드래그하여 너비 조절 · 더블클릭하여 기본값")
  sidebar.appendChild(handle)

  let dragging = false

  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    const rect = sidebar.getBoundingClientRect()
    const w = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, e.clientX - rect.left))
    applyWidth(w)
  }

  const onUp = () => {
    if (!dragging) return
    dragging = false
    document.body.style.userSelect = ""
    document.body.style.cursor = ""
    const cur = getComputedStyle(document.documentElement)
      .getPropertyValue("--left-sidebar-width")
      .trim()
    const w = parseInt(cur, 10)
    if (!Number.isNaN(w)) localStorage.setItem(STORAGE_KEY, String(w))
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
  }

  handle.addEventListener("pointerdown", (e) => {
    dragging = true
    e.preventDefault()
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  })

  // 더블클릭하면 기본 폭으로 복원
  handle.addEventListener("dblclick", () => {
    document.documentElement.style.removeProperty("--left-sidebar-width")
    localStorage.removeItem(STORAGE_KEY)
  })
}

document.addEventListener("nav", setupSidebarResize)
