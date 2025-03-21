
  export function getSingleLineTextFittedFontSize(itemWidth: number, itemHeight: number, text: string, font: string): number {
    const testFontSize: number = 200;
    const scaleX: number =
      testFontSize /
      getRenderedSingleLineTextWidth(text, `${testFontSize}px ${font}`);

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