
  export function getSingleLineTextFittedFontSize(itemWidth: number, itemHeight: number, text: string, font: string): number {
    if (itemWidth <= 0 || itemHeight <= 0) {
      return 1;
    }

    const testFontSize: number = 200;
    const renderedWidth = getRenderedSingleLineTextWidth(text, `${testFontSize}px ${font}`);
    if (renderedWidth <= 0) {
      return itemHeight;
    }

    const scaleX: number = testFontSize / renderedWidth;

    return Math.min(scaleX * itemWidth, itemHeight);
  }

  export function getRenderedSingleLineTextWidth(
    text: string,
    fontStyles: string
  ): number {
    const canvas: HTMLCanvasElement = document.createElement("canvas");
    const context: CanvasRenderingContext2D = canvas.getContext("2d")!;
    context.font = fontStyles;
    const metrics = context.measureText(text);

    return metrics.width;
  }

  export function getCalibratedFontSize(
    fontSize: number,
    calibration: { width: number; height: number; text: string; base_font_size: number } | undefined,
    font: string,
    renderScale: number = 1
  ): number {
    if (
      !calibration ||
      !calibration.width ||
      !calibration.height ||
      !calibration.text ||
      !calibration.base_font_size
    ) {
      return fontSize;
    }

    const testFontSize = 200;
    const metrics = getRenderedTextMetrics(
      calibration.text,
      `${testFontSize}px ${font}`
    );

    if (metrics.width <= 0 || metrics.height <= 0) {
      return fontSize;
    }

    const scaledWidth = calibration.width * renderScale;
    const scaledHeight = calibration.height * renderScale;
    const scaleX = testFontSize / metrics.width;
    const scaleY = testFontSize / metrics.height;
    const calibratedTemplateFontSize = Math.floor(
      Math.min(scaleX * scaledWidth, scaleY * scaledHeight)
    );

    return (fontSize / calibration.base_font_size) * calibratedTemplateFontSize;
  }

  export function getMultiLineTextFittedFontSize(
    itemWidth: number,
    itemHeight: number,
    text: string,
    font: string,
    fontSize: number,
    lineHeight: number,
    padding: { top: number; right: number; bottom: number; left: number }
  ): number {
    const width = itemWidth - padding.left - padding.right;
    const height = itemHeight - padding.top - padding.bottom;

    if (!text || width <= 0 || height <= 0) {
      return fontSize;
    }

    let fittedSize = fontSize;
    while (fittedSize > 1) {
      const measuredHeight = getWrappedTextHeight(
        text,
        `${fittedSize}px ${font}`,
        width,
        fittedSize * lineHeight
      );

      if (Math.ceil(measuredHeight) <= height) {
        break;
      }

      fittedSize -= 1;
    }

    return fittedSize;
  }

  function getWrappedTextHeight(
    text: string,
    fontStyles: string,
    maxWidth: number,
    lineHeight: number
  ): number {
    const canvas: HTMLCanvasElement = document.createElement("canvas");
    const context: CanvasRenderingContext2D = canvas.getContext("2d")!;
    context.font = fontStyles;

    const paragraphs = text.split(/\r?\n/);
    let lines = 0;

    paragraphs.forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter((word) => word.length > 0);
      if (words.length === 0) {
        lines += 1;
        return;
      }

      let line = "";
      words.forEach((word) => {
        /* The rendered element sets overflow-wrap: break-word, so a token too
           wide for the box is split across lines instead of overflowing it.
           Without modelling that here the measured height undercounts, and the
           caller stops shrinking while the text still clips. */
        const wordWidth = context.measureText(word).width;
        if (wordWidth > maxWidth) {
          if (line) {
            lines += 1;
            line = "";
          }
          lines += Math.ceil(wordWidth / maxWidth);
          return;
        }

        const testLine = line ? `${line} ${word}` : word;
        if (context.measureText(testLine).width > maxWidth && line) {
          lines += 1;
          line = word;
        } else {
          line = testLine;
        }
      });

      if (line) {
        lines += 1;
      }
    });

    return lines * lineHeight;
  }

  function getRenderedTextMetrics(
    text: string,
    fontStyles: string
  ): { width: number; height: number } {
    const canvas: HTMLCanvasElement = document.createElement("canvas");
    const context: CanvasRenderingContext2D = canvas.getContext("2d")!;
    context.font = fontStyles;
    const metrics = context.measureText(text);
    const height =
      (metrics.actualBoundingBoxAscent || 0) +
      (metrics.actualBoundingBoxDescent || 0);

    return {
      width: metrics.width,
      height: height || parseFloat(fontStyles) || 0,
    };
  }
