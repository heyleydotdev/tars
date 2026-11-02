import type { BlueprintHierarchyOutput } from '@tars/core/schemas/blueprint'

import { DIAGRAM_LINE, DIAGRAM_MUTED, DIAGRAM_TEXT, wrapSvgText } from '../lib/diagram'

const ROOT_WIDTH = 260
const ROOT_HEIGHT = 36
const AREA_HEIGHT = 30
const ITEM_WIDTH = 240
const ITEM_HEIGHT = 38
const ITEM_GAP = 8
const COLUMN_GAP = 36
const PADDING = 24
const BUS_GAP = 14

export default function BlueprintHierarchy({
  title,
  data,
  svgRef
}: {
  title: string
  data: BlueprintHierarchyOutput
  svgRef: React.RefObject<SVGSVGElement | null>
}) {
  const columns = data.groups.map((group, index) => ({
    ...group,
    x: PADDING + index * (ITEM_WIDTH + COLUMN_GAP)
  }))
  const width = Math.max(
    columns.length * ITEM_WIDTH + (columns.length - 1) * COLUMN_GAP + PADDING * 2,
    ROOT_WIDTH + PADDING * 2
  )
  const rootX = width / 2
  const columnsTop = PADDING + ROOT_HEIGHT + 44
  const busY = columnsTop - 22
  const rows = Math.max(...columns.map((column) => column.items.length), 1)
  const height =
    columnsTop + AREA_HEIGHT + ITEM_GAP + rows * (ITEM_HEIGHT + ITEM_GAP) - ITEM_GAP + PADDING
  const [titleLine, titleRest] = wrapSvgText(title, 34)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${title} hierarchy`}
      className="max-w-none"
    >
      <rect x="0" y="0" width={width} height={height} fill="#09090b" />

      <path
        d={`M ${rootX} ${PADDING + ROOT_HEIGHT} V ${busY}`}
        stroke={DIAGRAM_LINE}
        strokeWidth="1"
        fill="none"
      />

      {columns.map((column) => {
        const center = column.x + ITEM_WIDTH / 2

        return (
          <g key={column.name}>
            <path
              d={`M ${rootX} ${busY} H ${center} V ${columnsTop}`}
              stroke={DIAGRAM_LINE}
              strokeWidth="1"
              fill="none"
            />
            <path
              d={`M ${center} ${columnsTop + AREA_HEIGHT} V ${columnsTop + AREA_HEIGHT + 8} H ${column.x - BUS_GAP}`}
              stroke={DIAGRAM_LINE}
              strokeWidth="1"
              fill="none"
            />
            <line
              x1={column.x - BUS_GAP}
              y1={columnsTop + AREA_HEIGHT + 8}
              x2={column.x - BUS_GAP}
              y2={
                columnsTop +
                AREA_HEIGHT +
                ITEM_GAP +
                (column.items.length - 1) * (ITEM_HEIGHT + ITEM_GAP) +
                ITEM_HEIGHT / 2
              }
              stroke={DIAGRAM_LINE}
              strokeWidth="1"
            />
            <rect
              x={column.x}
              y={columnsTop}
              width={ITEM_WIDTH}
              height={AREA_HEIGHT}
              fill="#18181b"
              stroke="#38bdf8"
              strokeWidth="1"
            />
            <text
              x={center}
              y={columnsTop + 19}
              textAnchor="middle"
              fill="#38bdf8"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize="11"
              letterSpacing="0.08em"
            >
              {column.name.toUpperCase()}
            </text>
            {column.items.map((item, index) => {
              const y = columnsTop + AREA_HEIGHT + ITEM_GAP + index * (ITEM_HEIGHT + ITEM_GAP)
              const [line, rest] = wrapSvgText(item, 34)

              return (
                <g key={`${column.name}-${index}`}>
                  <line
                    x1={column.x - BUS_GAP}
                    y1={y + ITEM_HEIGHT / 2}
                    x2={column.x}
                    y2={y + ITEM_HEIGHT / 2}
                    stroke={DIAGRAM_LINE}
                    strokeWidth="1"
                  />
                  <rect
                    x={column.x}
                    y={y}
                    width={ITEM_WIDTH}
                    height={ITEM_HEIGHT}
                    fill="#111113"
                    stroke={DIAGRAM_LINE}
                    strokeWidth="1"
                  />
                  <circle cx={column.x + 12} cy={y + ITEM_HEIGHT / 2} r="3" fill="#34d399" />
                  <text
                    x={column.x + 24}
                    y={rest ? y + 15 : y + 22}
                    fill={DIAGRAM_TEXT}
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                    fontSize="11"
                  >
                    {line}
                  </text>
                  {rest ? (
                    <text
                      x={column.x + 24}
                      y={y + 28}
                      fill={DIAGRAM_MUTED}
                      fontFamily="ui-sans-serif, system-ui, sans-serif"
                      fontSize="11"
                    >
                      {rest}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </g>
        )
      })}

      <rect
        x={rootX - ROOT_WIDTH / 2}
        y={PADDING}
        width={ROOT_WIDTH}
        height={ROOT_HEIGHT}
        fill="#18181b"
        stroke="#34d399"
        strokeWidth="1"
      />
      <text
        x={rootX}
        y={titleRest ? PADDING + 16 : PADDING + 22}
        textAnchor="middle"
        fill={DIAGRAM_TEXT}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="12"
        fontWeight="600"
      >
        {titleLine}
      </text>
      {titleRest ? (
        <text
          x={rootX}
          y={PADDING + 29}
          textAnchor="middle"
          fill={DIAGRAM_MUTED}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="11"
        >
          {titleRest}
        </text>
      ) : null}
    </svg>
  )
}
