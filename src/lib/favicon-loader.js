"use client"

const CANVAS_SIZE = 16
const SPINNER_COLOR = "#3498db"
const SPINNER_TRACK = "rgba(52, 152, 219, 0.18)"
const ROTATION_SPEED = 0.22

const state = {
  animationFrameId: null,
  canvas: null,
  context: null,
  iconLink: null,
  originalHref: null,
  originalType: null,
  originalRel: null,
  createdLink: false,
  isRunning: false,
  activeCount: 0,
  rotation: 0,
  lastFrameTime: 0,
}

function getDocument() {
  return typeof document === "undefined" ? null : document
}

function ensureCanvas() {
  if (state.canvas && state.context) {
    return state.context
  }

  const canvas = document.createElement("canvas")
  canvas.width = CANVAS_SIZE
  canvas.height = CANVAS_SIZE

  state.canvas = canvas
  state.context = canvas.getContext("2d")

  return state.context
}

function getOrCreateFaviconLink() {
  const doc = getDocument()
  if (!doc) {
    return null
  }

  const existingLink =
    doc.querySelector('link[rel~="icon"]') ||
    doc.querySelector('link[rel="shortcut icon"]')

  if (existingLink instanceof HTMLLinkElement) {
    state.createdLink = false
    return existingLink
  }

  const link = doc.createElement("link")
  link.rel = "icon"
  doc.head.appendChild(link)
  state.createdLink = true

  return link
}

function cacheOriginalFavicon(link) {
  state.iconLink = link
  state.originalHref = link.getAttribute("href")
  state.originalType = link.getAttribute("type")
  state.originalRel = link.getAttribute("rel") || "icon"
}

function drawSpinner(rotation) {
  const context = ensureCanvas()
  if (!context || !state.canvas) {
    return null
  }

  context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  const center = CANVAS_SIZE / 2
  const radius = 5

  context.lineCap = "round"
  context.lineWidth = 2

  // Track tipis supaya spinner tetap terbaca di ukuran 16x16.
  context.beginPath()
  context.strokeStyle = SPINNER_TRACK
  context.arc(center, center, radius, 0, Math.PI * 2)
  context.stroke()

  // Arc utama yang diputar halus pada setiap frame.
  context.beginPath()
  context.strokeStyle = SPINNER_COLOR
  context.arc(center, center, radius, rotation, rotation + Math.PI * 1.45)
  context.stroke()

  return state.canvas.toDataURL("image/png")
}

function renderFrame(timestamp) {
  if (!state.isRunning || !state.iconLink) {
    return
  }

  if (!state.lastFrameTime) {
    state.lastFrameTime = timestamp
  }

  const delta = timestamp - state.lastFrameTime
  state.lastFrameTime = timestamp
  state.rotation += delta * ROTATION_SPEED * 0.01

  const dataUrl = drawSpinner(state.rotation)
  if (dataUrl) {
    state.iconLink.href = dataUrl
    state.iconLink.type = "image/png"
    state.iconLink.rel = state.originalRel || "icon"
  }

  state.animationFrameId = window.requestAnimationFrame(renderFrame)
}

export function startFaviconLoading() {
  const doc = getDocument()
  if (!doc) {
    return
  }

  state.activeCount += 1

  if (state.isRunning) {
    return
  }

  const link = getOrCreateFaviconLink()
  if (!link) {
    state.activeCount = Math.max(0, state.activeCount - 1)
    return
  }

  cacheOriginalFavicon(link)
  state.isRunning = true
  state.rotation = 0
  state.lastFrameTime = 0
  state.animationFrameId = window.requestAnimationFrame(renderFrame)
}

export function stopFaviconLoading() {
  if (state.activeCount > 0) {
    state.activeCount -= 1
  }

  if (state.activeCount > 0) {
    return
  }

  if (!state.iconLink) {
    return
  }

  state.isRunning = false
  state.rotation = 0
  state.lastFrameTime = 0

  if (state.animationFrameId !== null) {
    window.cancelAnimationFrame(state.animationFrameId)
    state.animationFrameId = null
  }

  if (state.createdLink && !state.originalHref) {
    state.iconLink.remove()
  } else {
    if (state.originalHref) {
      state.iconLink.href = state.originalHref
    } else {
      state.iconLink.removeAttribute("href")
    }

    if (state.originalType) {
      state.iconLink.type = state.originalType
    } else {
      state.iconLink.removeAttribute("type")
    }

    state.iconLink.rel = state.originalRel || "icon"
  }

  state.iconLink = null
  state.originalHref = null
  state.originalType = null
  state.originalRel = null
  state.createdLink = false
  state.activeCount = 0
}

const faviconLoader = {
  startFaviconLoading,
  stopFaviconLoading,
}

export default faviconLoader
