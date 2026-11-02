import type { BlueprintFlowOutput, BlueprintFlowStepKind } from '@tars/core/schemas/blueprint'

import { DIAGRAM_LINE, DIAGRAM_MUTED, DIAGRAM_TEXT, wrapSvgText } from '../lib/diagram'

const NODE_WIDTH = 220
const NODE_HEIGHT = 88
const GAP_X = 56
const GAP_Y = 44
const PADDING = 24
const COLUMNS = 3

const KIND_COLORS: Record<BlueprintFlowStepKind, string> = {
  entry: '#34d399',
  screen: '#38bdf8',
  decision: '#fcd34d',
  outcome: '#a78bfa'
}

export default function BlueprintFlowchart({
  data,
  svgRef
}: {
  data: BlueprintFlowOutput
  svgRef: React.RefObject<SVGSVGElement | null>
}) {
  const steps = data.steps
  const rows = Math.ceil(steps.length / COLUMNS)
  const width = PADDING * 2 + COLUMNS * NODE_WIDTH + (COLUMNS - 1) * GAP_X
  const height = PADDING * 2 + rows * NODE_HEIGHT + Math.max(rows - 1, 0) * GAP_Y
  const positions = steps.map((_, index) => {
    const row = Math.floor(index / COLUMNS)
    const column = row % 2 === 0 ? index % COLUMNS : COLUMNS - 1 - (index % COLUMNS)

    return {
      x: PADDING + column * (NODE_WIDTH + GAP_X),
      y: PADDING + row * (NODE_HEIGHT + GAP_Y)
    }
  })

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label="App flow"
      className="max-w-none"
    >
      <rect x="0" y="0" width={width} height={height} fill="#09090b" />
      <defs>
        <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={DIAGRAM_LINE} />
        </marker>
      </defs>

      {steps.slice(0, -1).map((_, index) => {
        const from = positions[index]
        const to = positions[index + 1]

        if (!from || !to) return null

        const sameRow = from.y === to.y
        const start = sameRow
          ? { x: to.x > from.x ? from.x + NODE_WIDTH : from.x, y: from.y + NODE_HEIGHT / 2 }
          : { x: from.x + NODE_WIDTH / 2, y: from.y + NODE_HEIGHT }
        const end = sameRow
          ? { x: to.x > from.x ? to.x : to.x + NODE_WIDTH, y: to.y + NODE_HEIGHT / 2 }
          : { x: to.x + NODE_WIDTH / 2, y: to.y }

        return (
          <line
            key={`arrow-${index}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={DIAGRAM_LINE}
            strokeWidth="1"
            markerEnd="url(#flow-arrow)"
          />
        )
      })}

      {steps.map((step, index) => {
        const position = positions[index]

        if (!position) return null

        const [labelLine, labelRest] = wrapSvgText(step.label, 26)
        const [detailLine, detailRest] = wrapSvgText(step.detail, 32)

        return (
          <g key={`${step.label}-${index}`}>
            <rect
              x={position.x}
              y={position.y}
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              fill="#18181b"
              stroke={KIND_COLORS[step.kind]}
              strokeWidth="1"
            />
            <text
              x={position.x + NODE_WIDTH - 12}
              y={position.y + 18}
              textAnchor="end"
              fill={KIND_COLORS[step.kind]}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="9"
              letterSpacing="0.08em"
            >
              {step.kind.toUpperCase()}
            </text>
            <text
              x={position.x + 14}
              y={labelRest ? position.y + 28 : position.y + 34}
              fill={DIAGRAM_TEXT}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="12"
              fontWeight="600"
            >
              {labelLine}
            </text>
            {labelRest ? (
              <text
                x={position.x + 14}
                y={position.y + 43}
                fill={DIAGRAM_MUTED}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontSize="11"
              >
                {labelRest}
              </text>
            ) : null}
            <text
              x={position.x + 14}
              y={position.y + (labelRest ? 62 : 56)}
              fill={DIAGRAM_MUTED}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="10"
            >
              {detailLine}
            </text>
            {detailRest ? (
              <text
                x={position.x + 14}
                y={position.y + (labelRest ? 76 : 70)}
                fill={DIAGRAM_MUTED}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
                fontSize="10"
              >
                {detailRest}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
