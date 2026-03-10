import { Card, CardHeader, CardContent, Skeleton, HoverGuidance } from '../../../../../../../components/ui-components'

const AIPreviewCardSkeleton = () => {
  return (
    <HoverGuidance content="Generate another AI preview (up to 3 per project). Use the form above.">
      <Card
        className="rounded-none border-border overflow-hidden w-[240px] shrink-0 border-dashed"
      >
      <CardHeader className="min-h-[40px] px-2 py-2 flex flex-row items-center gap-2 flex-wrap border-b border-border bg-muted/30">
        <Skeleton className="h-3 w-16 rounded-none bg-primary/10 shrink-0" />
        <Skeleton className="h-3 flex-1 min-w-0 rounded-none bg-primary/10" />
        <Skeleton className="h-3 w-14 rounded-none bg-primary/10 shrink-0" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[120px] w-full border-b border-border bg-muted/50 flex items-center justify-center overflow-hidden">
          <Skeleton className="h-full w-full rounded-none bg-primary/10" />
        </div>
        <div className="flex flex-col gap-1.5 p-2">
          <Skeleton className="h-3 w-28 rounded-none bg-primary/10" />
          <div className="h-8 w-full flex items-center justify-center border border-dashed border-border">
            <span className="font-body text-sm text-ink-muted">Generate another preview</span>
          </div>
        </div>
      </CardContent>
    </Card>
    </HoverGuidance>
  )
}

export default AIPreviewCardSkeleton
