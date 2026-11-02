import {
  META_ASR_MODEL,
  META_CHAT_MODEL,
  META_IMAGE_MODEL,
  META_SAM_MODEL
} from '@tars/core/constants'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@tars/ui/components/table'

import ConsolePanel from './console-panel'

export default function SettingsAbout({ appInfo }: { appInfo: AppInfo | null }) {
  return (
    <ConsolePanel title="about" accent="bg-amber-300" className="flex-1">
      <div className="max-w-4xl space-y-4 p-3">
        <Table className="border-border border">
          <TableBody>
            <TableRow>
              <TableCell className="text-muted-foreground">Version</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {appInfo?.version ?? '—'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">Electron</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {appInfo?.electron ?? '—'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-muted-foreground">Build</TableCell>
              <TableCell className="text-right">
                {appInfo ? (appInfo.packaged ? 'Packaged' : 'Development') : '—'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Table className="bg-border border-separate border-spacing-px">
          <TableHeader>
            <TableRow>
              <TableHead className="bg-background text-muted-foreground">Model</TableHead>
              <TableHead className="bg-background text-muted-foreground">Used for</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell rowSpan={4} className="bg-background align-top font-mono text-xs">
                {META_CHAT_MODEL}
              </TableCell>
              <TableCell className="bg-background whitespace-normal">
                Chat, summaries, and desk extraction
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="bg-background whitespace-normal">
                Incident analysis and postmortems
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="bg-background whitespace-normal">
                Blueprint requirements and proposal drafts
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="bg-background whitespace-normal">
                UI review findings and redesign prompts
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="bg-background font-mono text-xs">{META_IMAGE_MODEL}</TableCell>
              <TableCell className="bg-background whitespace-normal">
                UI redesign concepts
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="bg-background font-mono text-xs">{META_SAM_MODEL}</TableCell>
              <TableCell className="bg-background whitespace-normal">
                Object segmentation for measurements
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="bg-background font-mono text-xs">{META_ASR_MODEL}</TableCell>
              <TableCell className="bg-background whitespace-normal">
                Voice transcription and wake listening
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </ConsolePanel>
  )
}
