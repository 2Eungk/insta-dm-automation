function clickDownloadLink(filename: string, href: string): void {
  const link = document.createElement("a")
  link.href = href
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
}

function downloadWithObjectUrl(filename: string, text: string, mimeType: string): boolean {
  let url: string | null = null

  try {
    const blob = new Blob([text], { type: mimeType })
    url = window.URL.createObjectURL(blob)
    clickDownloadLink(filename, url)
    return true
  } catch (error) {
    if (error instanceof Error) {
      return false
    }
    throw error
  } finally {
    if (url !== null) {
      window.URL.revokeObjectURL(url)
    }
  }
}

function downloadWithDataUrl(filename: string, text: string, mimeType: string): boolean {
  try {
    clickDownloadLink(filename, `data:${mimeType},${encodeURIComponent(text)}`)
    return true
  } catch (error) {
    if (error instanceof Error) {
      return false
    }
    throw error
  }
}

function openExportFallback(filename: string, text: string): boolean {
  const fallbackWindow = window.open("", "_blank", "noopener,noreferrer")
  if (fallbackWindow === null) {
    return false
  }

  fallbackWindow.document.title = filename
  const heading = fallbackWindow.document.createElement("h1")
  heading.textContent = filename
  const pre = fallbackWindow.document.createElement("pre")
  pre.textContent = text
  fallbackWindow.document.body.append(heading, pre)
  return true
}

export function downloadTextFile(filename: string, text: string, mimeType: string): void {
  if (downloadWithObjectUrl(filename, text, mimeType)) {
    return
  }

  if (downloadWithDataUrl(filename, text, mimeType)) {
    return
  }

  if (openExportFallback(filename, text)) {
    return
  }

  window.alert("브라우저가 파일 내보내기를 차단했습니다. 다른 브라우저에서 다시 시도하거나 팝업 차단 설정을 확인해 주세요.")
}
