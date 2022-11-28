import { SVG, on as SVGOn, Svg } from "@svgdotjs/svg.js"
import { colord } from "colord"
import RandomGen from "random-seed"

interface Config {
  canvas?: Svg;
  seed?: string;
  keepSeed: boolean;
  width: number;
  height: number;
  circleSize: number;
  padding: number;
  stepSize: number;
  lineChance: number;
  maxLineLength: number;
  colorsPerLine: number;
  coloredDots?: boolean;
  blockout?: { left: number, top: number, bottom: number, right: number }
}

let config: Config = {
  seed: "",
  keepSeed: false,
  width: 800,
  height: 800,
  padding: 25,
  circleSize: 10,
  stepSize: 50,
  lineChance: .1,
  maxLineLength: 3,
  colorsPerLine: 3,
  coloredDots: true,
}

const colors = [
  "#FED61E",
  "#44B4E9",
  "#008317",
  "#002E5C",
  "#003A3E",
  "#6C2400",
  "#FF9900",
]

// calculate absolute pposition with padding
function calcPosition({ x, y, padding, numElements, reducedDims, subtractHalfCircle = true }) {
  const pos: Record<string, number> = {
    posX: x / numElements.x * reducedDims.width + padding,
    posY: y / numElements.y * reducedDims.height + padding
  }
  if (subtractHalfCircle) {
    for (const key in pos) {
      pos[key] -= reducedDims.halfCircle
    }
  }
  return pos
}

function drawElement({ x, y, canvas, occupationMap, random, lineChance, lineLengthLimit, numElements, padding, circleSize, colorsPerLine, coloredDots, reducedDims, blockedDimensions }: Config & { x: number, y: number, occupationMap: number[][], random: RandomGen, lineLengthLimit: number, numElements: { x: number, y: number }, reducedDims: { width: number, height: number, halfCircle: number }, blockedDimensions: { top: number, left: number, right: number, bottom: number } }) {

  let length = null
  if (random.random() < lineChance!) length = random.intBetween(2, lineLengthLimit)
  if (occupationMap[x].includes(y) || !canvas) return
  if (length && x != numElements.x && y != 0 && (x < blockedDimensions.left - 1 || x >= blockedDimensions.right || y < blockedDimensions.top || y >= blockedDimensions.bottom - 1)) {
    // Line
    const { posX, posY } = calcPosition({ x, y, padding, numElements, reducedDims, subtractHalfCircle: false, })

    const overshootX = Math.min(x + length - numElements.x, x + length - blockedDimensions.left);
    const overshootY = Math.min((y - length) * -1, (y - blockedDimensions.bottom + length) * -1);
    if (y >= blockedDimensions.bottom) { console.log(x, y, length, overshootY) };

    const overshoot = Math.max(overshootX, overshootY)
    if (overshoot > 0) length -= overshoot

    const { posX: endX, posY: endY } = calcPosition({
      x: x + length,
      y: y - length,
      padding,
      numElements,
      reducedDims,
      subtractHalfCircle: false,
    })

    const gradient = canvas!.gradient("linear", (add) => {
      for (let i = 0; i < colorsPerLine; i++) {
        add.stop({ offset: i / (colorsPerLine - 1), color: colors[random(colors.length)] })
      }
    }).transform({
      rotate: -45,
      origin: { x: .5, y: .5 }
    })
    canvas.line(posX, posY, endX, endY).stroke({
      width: circleSize,
      linecap: "round"
    }).attr({ "stroke": gradient })

    for (let i = 0; i <= length; i++) {
      if (x + i <= numElements.x) occupationMap[x + i].push(y - i)
    }
  } else {
    // Circle
    const { posX, posY } = calcPosition({ x, y, padding, numElements, reducedDims })
    canvas
      .circle(circleSize)
      .fill(coloredDots ? colors[random(colors.length)] : "#333")
      .move(posX, posY)
    occupationMap[x].push(y)
  }
}

function render(configParams: Config) {
  // config.canvas?.remove()

  if (config.seed === "") config.seed = RandomGen.create().string(16)

  const { seed, width, height, padding, circleSize, stepSize, maxLineLength, blockout } = configParams

  const random = RandomGen.create(seed)

  const reducedDims = {
    width: width - 2 * padding,
    height: height - 2 * padding,
    halfCircle: circleSize / 2
  }


  const numElements = {
    x: Math.floor(reducedDims.width / stepSize),
    y: Math.floor(reducedDims.height / stepSize)
  }

  const blockedDimensions = {
    top: Math.floor((blockout!.top - padding) / stepSize),
    right: Math.floor((blockout!.right + padding) / stepSize),
    bottom: Math.floor((blockout!.bottom + padding) / stepSize),
    left: Math.floor((blockout!.left - padding) / stepSize),
  }

  const lineLengthLimit = maxLineLength;

  // Create 2D array of points in grid
  let occupationMap: number[][] = Array.from({ length: numElements.x + 1 }, (_: never, x: number) => {
    let k = [];
    if (x >= blockedDimensions.left && x < blockedDimensions.right) {
      for (let index = blockedDimensions.top; index < blockedDimensions.bottom - 2; index++) {
        k.push(index)
      }
    }
    return k
  })


  for (let x = 0; x <= numElements.x; x++) {
    for (let y = 0; y <= numElements.y; y++) {
      drawElement({ x, y, occupationMap, random, numElements, lineLengthLimit, reducedDims, blockedDimensions, ...config })
    }
  }
}

SVGOn(document, "DOMContentLoaded", () => {
  const hero = document.querySelector("#hero")!
  const dimens = hero.getBoundingClientRect()
  const { width, height } = dimens;
  config.width = width
  config.height = height
  config.canvas = SVG().viewbox(0, 0, width, height).size(width, height).addTo('#hero')
  const block = hero.children[0]
  config.blockout = block.getBoundingClientRect()

  render(config)
  window.addEventListener('resize', () => {
    config.canvas!.clear()
    const hero = document.querySelector("#hero")!
    const dimens = hero.getBoundingClientRect()
    const { width, height } = dimens;
    config.width = width
    config.height = height
    config.canvas!.viewbox(0, 0, width, height).size(width, height)
    config.blockout = block.getBoundingClientRect()
    render(config)
  })
})


console.log(config.canvas);