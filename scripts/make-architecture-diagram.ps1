$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path (Get-Location) 'project-gallery'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$out = Join-Path $outDir 'loopaal-architecture-diagram.png'

$w = 1800
$h = 1200
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

$bg = [System.Drawing.Color]::FromArgb(247,249,252)
$ink = [System.Drawing.Color]::FromArgb(18,26,38)
$muted = [System.Drawing.Color]::FromArgb(74,88,108)
$line = [System.Drawing.Color]::FromArgb(178,192,211)
$blue = [System.Drawing.Color]::FromArgb(0,94,204)
$green = [System.Drawing.Color]::FromArgb(0,128,84)
$purple = [System.Drawing.Color]::FromArgb(92,63,160)
$amber = [System.Drawing.Color]::FromArgb(184,112,0)
$dark = [System.Drawing.Color]::FromArgb(16,24,38)
$paper = [System.Drawing.Color]::White
$softBlue = [System.Drawing.Color]::FromArgb(229,240,255)
$softGreen = [System.Drawing.Color]::FromArgb(226,247,238)
$softPurple = [System.Drawing.Color]::FromArgb(241,236,255)
$softAmber = [System.Drawing.Color]::FromArgb(255,247,224)

$g.Clear($bg)

$titleFont = New-Object System.Drawing.Font('Segoe UI', 38, [System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Regular)
$boxFont = New-Object System.Drawing.Font('Segoe UI', 17, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Regular)
$monoFont = New-Object System.Drawing.Font('Consolas', 11, [System.Drawing.FontStyle]::Regular)
$smallFont = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Regular)

function Brush($c) { New-Object System.Drawing.SolidBrush $c }
function PenObj($c, $width = 2) { New-Object System.Drawing.Pen $c, $width }
function RoundPath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $width - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $width - $d, $y + $height - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $height - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}
function Text($text, $font, $color, $x, $y, $width, $height) {
  $r = New-Object System.Drawing.RectangleF ([float]$x), ([float]$y), ([float]$width), ([float]$height)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $g.DrawString($text, $font, (Brush $color), $r, $fmt)
}
function Card($x, $y, $width, $height, $title, $body, $fill, $accent) {
  $shadow = RoundPath ($x + 4) ($y + 6) $width $height 22
  $g.FillPath((Brush ([System.Drawing.Color]::FromArgb(22,20,36,56))), $shadow)
  $p = RoundPath $x $y $width $height 22
  $g.FillPath((Brush $fill), $p)
  $g.DrawPath((PenObj $line 1.4), $p)
  $g.FillRectangle((Brush $accent), $x, $y, 8, $height)
  Text $title $boxFont $ink ($x + 24) ($y + 18) ($width - 48) 38
  Text $body $bodyFont $muted ($x + 24) ($y + 66) ($width - 48) ($height - 76)
}
function Arrow($x1, $y1, $x2, $y2, $color = $blue, $width = 4) {
  $pen = New-Object System.Drawing.Pen $color, $width
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor
  $g.DrawLine($pen, [float]$x1, [float]$y1, [float]$x2, [float]$y2)
  $pen.Dispose()
}
function Dashed($x1, $y1, $x2, $y2, $color = $purple, $width = 3) {
  $pen = New-Object System.Drawing.Pen $color, $width
  $pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor
  $g.DrawLine($pen, [float]$x1, [float]$y1, [float]$x2, [float]$y2)
  $pen.Dispose()
}
function PolyArrow($points, $color = $blue, $width = 4) {
  $pen = New-Object System.Drawing.Pen $color, $width
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  for ($i = 0; $i -lt ($points.Count - 2); $i += 2) {
    $endCap = $pen.EndCap
    if ($i -eq ($points.Count - 4)) {
      $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor
    }
    $g.DrawLine($pen, [float]$points[$i], [float]$points[$i + 1], [float]$points[$i + 2], [float]$points[$i + 3])
    $pen.EndCap = $endCap
  }
  $pen.Dispose()
}
function Pill($x, $y, $text, $fill, $fg) {
  $size = $g.MeasureString($text, $smallFont)
  $rw = [Math]::Ceiling($size.Width) + 28
  $p = RoundPath $x $y $rw 32 16
  $g.FillPath((Brush $fill), $p)
  Text $text $smallFont $fg ($x + 14) ($y + 7) ($rw - 28) 18
}

Text 'Loopaal Architecture' $titleFont $ink 60 38 650 60
Text 'Supervised AI revenue-ops: criteria become researched prospects, memory, approval-gated drafts, and customer-owned channel actions.' $subFont $muted 62 96 1320 38
Pill 1380 50 'Vercel hosted Next.js' $softBlue $blue
Pill 1380 88 'AWS DynamoDB source of truth' $softGreen $green
Pill 1380 126 'Customer-owned integrations' $softPurple $purple

Card 60 220 245 250 'User Workspace' "- sign up / sign in`n- onboarding tutorial`n- business identity`n- campaign criteria`n- human approval" $paper $blue
Card 360 220 245 250 'Vercel Web App' "- Next.js App Router`n- landing + setup`n- dashboard workflow`n- side notifications`n- API routes" $softBlue $blue
Card 660 220 245 250 'Loopaal Core' "- campaign orchestrator`n- approval policy`n- memory engine`n- connection resolver`n- audit writer" $paper $dark
Card 960 220 245 250 'Worker Agents' "- researcher`n- analyst`n- writer`n- archivist`n- scheduler`n- reply-handler" $softPurple $purple
Card 1260 220 245 250 'Approval Queue' "- draft review`n- safe field checks`n- live-action gating`n- status tracking`n- audit events" $softAmber $amber
Card 1560 220 180 250 'Channels' "- Gmail drafts`n- WhatsApp`n- website`n- Drive/Sheets`n- replies" $softGreen $green

Arrow 305 345 360 345 $blue 4
Arrow 605 345 660 345 $blue 4
Arrow 905 345 960 345 $blue 4
Arrow 1205 345 1260 345 $amber 4
Arrow 1505 345 1560 345 $green 4
Text 'primary supervised workflow' $monoFont $blue 715 156 340 26
Arrow 690 186 1110 186 $blue 3

Card 60 590 345 170 'Supabase Auth' 'Server-verified sessions identify the workspace owner and isolate every customer workspace.' $softGreen $green
Card 455 590 345 170 'Google OAuth' 'Connects Gmail compose, send-as metadata, signatures, Drive, and Sheets scopes per workspace.' $softBlue $blue
Card 850 590 345 170 'AI Providers' 'Loopaal trial AI runs for 5 campaigns. Customer AI later uses OAuth or a secure vault reference, not raw app DB keys.' $softPurple $purple
Card 1245 590 495 170 'Customer-Owned Channels' 'Google Gmail/Drive/Sheets, Meta WhatsApp Cloud API, and website webhooks on Cloudflare, Vercel, CMS, or custom HTTPS endpoints.' $softAmber $amber

Card 60 870 520 210 'AWS DynamoDB - Canonical Database' 'Source of truth for campaigns, prospects, worker jobs, approvals, audit events, connections, workspace identity, onboarding state, and normalized memory.' $paper $green
Card 640 870 520 210 'Memory Factory' 'Optional after Google connection: export context to Drive/Sheets, edit safe fields, import validated changes, and save JSON snapshots.' $softPurple $purple
Card 1220 870 520 210 'Trust + Safety Layer' 'External actions are approval-gated. Webhooks use HMAC/signature checks where applicable. Sensitive tokens are not returned to the browser or committed to Git.' $paper $amber

Arrow 482 470 220 590 $green 3
Arrow 782 470 628 590 $blue 3
Arrow 782 470 1022 590 $purple 3
Arrow 1382 470 1492 590 $amber 3
PolyArrow @(782,470,782,540,430,540,430,870) $green 4
PolyArrow @(1082,470,1082,546,445,546,445,870) $green 4
Arrow 628 760 900 870 $purple 3
Arrow 628 760 900 870 $purple 3
Arrow 1492 760 1480 870 $amber 3
Dashed 1492 590 840 470 $green 3

Text 'canonical writes first' $monoFont $green 330 820 260 24
Text 'optional export / import' $monoFont $purple 770 830 280 24
Text 'inbound replies + webhook events' $monoFont $green 1040 528 360 24

$g.DrawLine((PenObj $line 1), 60, 1138, 1740, 1138)
Text "Core invariant: DynamoDB is Loopaal's canonical operational database. Google Drive/Sheets is an optional customer-owned Memory Factory. Gmail, WhatsApp, website updates, and AI providers are connected per customer workspace and governed by approval policy." $smallFont $muted 65 1155 1660 36

$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Get-Item $out | Select-Object FullName, Length
