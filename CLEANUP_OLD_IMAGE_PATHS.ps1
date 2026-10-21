# HAEON - optional cleanup for applying the changed-files ZIP to an EXISTING project.
# Run from PowerShell: & ".\CLEANUP_OLD_IMAGE_PATHS.ps1"
# Only deletes old asset paths if a byte-identical image exists at the new path.
$ErrorActionPreference = "Stop"
$imagesRoot = Join-Path $PSScriptRoot "assets\images"
$pairs = @(
    @{ Old = 'CI _ visual.png'; New = 'story/CI _ visual.png' }
    @{ Old = 'STORY_#Uba54#Uc778 #Uc774#Ubbf8#Uc9c0_1.png'; New = 'story/STORY_메인 이미지_1.png' }
    @{ Old = 'STORY_메인 이미지_1.png'; New = 'story/STORY_메인 이미지_1.png' }
    @{ Old = 'TASTE_01_ill.svg'; New = 'craft/TASTE_01_ill.svg' }
    @{ Old = 'TASTE_02_ill.svg'; New = 'craft/TASTE_02_ill.svg' }
    @{ Old = 'TASTE_03_ill.svg'; New = 'craft/TASTE_03_ill.svg' }
    @{ Old = 'TASTE_04_ill.svg'; New = 'craft/TASTE_04_ill.svg' }
    @{ Old = 'TASTE_05_ill.svg'; New = 'craft/TASTE_05_ill.svg' }
    @{ Old = 'brand-interlude-ingredients.jpg'; New = 'story/brand-interlude-ingredients.jpg' }
    @{ Old = 'brand-interlude-sea.jpg'; New = 'story/brand-interlude-sea.jpg' }
    @{ Old = 'brand-interlude-table.jpg'; New = 'story/brand-interlude-table.jpg' }
    @{ Old = 'brand-story.jpg'; New = 'story/brand-story.jpg' }
    @{ Old = 'brand__middle.png'; New = 'story/brand__middle.png' }
    @{ Old = 'brand_haeon_1.png'; New = 'story/brand_haeon_1.png' }
    @{ Old = 'brand_haeon_2.png'; New = 'story/brand_haeon_2.png' }
    @{ Old = 'brand_haeon_3.png'; New = 'story/brand_haeon_3.png' }
    @{ Old = 'brandcolor/B_Color_1.svg'; New = 'story/brandcolor/B_Color_1.svg' }
    @{ Old = 'brandcolor/B_Color_2.svg'; New = 'story/brandcolor/B_Color_2.svg' }
    @{ Old = 'brandcolor/B_Color_3.svg'; New = 'story/brandcolor/B_Color_3.svg' }
    @{ Old = 'brandcolor/B_Color_4.svg'; New = 'story/brandcolor/B_Color_4.svg' }
    @{ Old = 'brandcolor/B_Color_5.svg'; New = 'story/brandcolor/B_Color_5.svg' }
    @{ Old = 'brandcolor/B_Color_6.svg'; New = 'story/brandcolor/B_Color_6.svg' }
    @{ Old = 'brew-awakening.jpg'; New = 'craft/brew-awakening.jpg' }
    @{ Old = 'brew-clarity.jpg'; New = 'craft/brew-clarity.jpg' }
    @{ Old = 'brew-harmony.jpg'; New = 'craft/brew-harmony.jpg' }
    @{ Old = 'brew-origin.jpg'; New = 'craft/brew-origin.jpg' }
    @{ Old = 'brew-patience.jpg'; New = 'craft/brew-patience.jpg' }
    @{ Old = 'change.png'; New = 'craft/change.png' }
    @{ Old = 'chrysanthemum.jpg'; New = 'craft/chrysanthemum.jpg' }
    @{ Old = 'craft-intro-title-1945x1080.png'; New = 'craft/craft-intro-title-1945x1080.png' }
    @{ Old = 'craft.jpg'; New = 'craft/craft.jpg' }
    @{ Old = 'experience-hero-1920x1080.png'; New = 'experience/experience-hero-1920x1080.png' }
    @{ Old = 'experience/#Uc81c#Ud488 #Uc774#Ubbf8#Uc9c0_#Uba54#Uc778.png'; New = 'experience/제품 이미지_메인.png' }
    @{ Old = 'experience/제품 이미지_메인.png'; New = 'experience/제품 이미지_메인.png' }
    @{ Old = 'experience/#Ud574#Uc628 #Uc804#Ud1b5#Uc8fc #Ud328#Ud0a4#Uc9c0_100ml #Uc120#Ubb3c#Uc138#Ud2b8.png'; New = 'experience/해온 전통주 패키지_100ml 선물세트.png' }
    @{ Old = 'experience/해온 전통주 패키지_100ml 선물세트.png'; New = 'experience/해온 전통주 패키지_100ml 선물세트.png' }
    @{ Old = 'experience/#Ud574#Uc628 375ml.png'; New = 'experience/해온 375ml.png' }
    @{ Old = 'experience/해온 375ml.png'; New = 'experience/해온 375ml.png' }
    @{ Old = 'experience/#Ud574#Uc628 750ml #Uc120#Ubb3c #Uc138#Ud2b8.png'; New = 'experience/해온 750ml 선물 세트.png' }
    @{ Old = 'experience/해온 750ml 선물 세트.png'; New = 'experience/해온 750ml 선물 세트.png' }
    @{ Old = 'experience/#Ud574#Uc628 750ml.png'; New = 'experience/해온 750ml.png' }
    @{ Old = 'experience/해온 750ml.png'; New = 'experience/해온 750ml.png' }
    @{ Old = 'final-brand.jpg'; New = 'story/final-brand.jpg' }
    @{ Old = 'finish.png'; New = 'craft/finish.png' }
    @{ Old = 'glass.svg'; New = 'taste/glass.svg' }
    @{ Old = 'haeon-bottle.png'; New = 'experience/haeon-bottle.png' }
    @{ Old = 'haeon-diagram-overlay.png'; New = 'taste/haeon-diagram-overlay.png' }
    @{ Old = 'haeon-hero-bottle.png'; New = 'home/haeon-hero-bottle.png' }
    @{ Old = 'harmony.png'; New = 'craft/harmony.png' }
    @{ Old = 'hero-haeon.jpg'; New = 'home/hero-haeon.jpg' }
    @{ Old = 'logo/foot_logo_black.png'; New = 'story/logo/foot_logo_black.png' }
    @{ Old = 'logo/foot_logo_grey.png'; New = 'story/logo/foot_logo_grey.png' }
    @{ Old = 'logo/foot_logo_white.png'; New = 'story/logo/foot_logo_white.png' }
    @{ Old = 'logo/head_logo_horizontal.png'; New = 'story/logo/head_logo_horizontal.png' }
    @{ Old = 'logo/head_logo_symbol.png'; New = 'story/logo/head_logo_symbol.png' }
    @{ Old = 'logo/head_logo_vertical.png'; New = 'story/logo/head_logo_vertical.png' }
    @{ Old = 'maesil.jpg'; New = 'craft/maesil.jpg' }
    @{ Old = 'mosaic/EXPRIENCE.png'; New = 'home/EXPRIENCE.png' }
    @{ Old = 'mosaic/blue_pattern.png'; New = 'home/blue_pattern.png' }
    @{ Old = 'mosaic/blue_print.png'; New = 'home/blue_print.png' }
    @{ Old = 'mosaic/chrysanthemum.png'; New = 'home/chrysanthemum.png' }
    @{ Old = 'mosaic/dancheong.mp4'; New = 'home/dancheong.mp4' }
    @{ Old = 'mosaic/footer_wave.svg'; New = 'footer_wave.svg' }
    @{ Old = 'mosaic/green_pattern.png'; New = 'home/green_pattern.png' }
    @{ Old = 'mosaic/green_plum.mp4'; New = 'home/green_plum.mp4' }
    @{ Old = 'mosaic/haeon_bottles.png'; New = 'home/haeon_bottles.png' }
    @{ Old = 'mosaic/haeon_outer.png'; New = 'home/haeon_outer.png' }
    @{ Old = 'mosaic/koreanpaper_pattern.png'; New = 'home/koreanpaper_pattern.png' }
    @{ Old = 'mosaic/pear.png'; New = 'home/pear.png' }
    @{ Old = 'mosaic/rice_plant.mp4'; New = 'home/rice_plant.mp4' }
    @{ Old = 'mosaic/sunset.png'; New = 'home/sunset.png' }
    @{ Old = 'mosaic/wave.png'; New = 'home/wave.png' }
    @{ Old = 'mosaic/yeast.png'; New = 'home/yeast.png' }
    @{ Old = 'mosaic/yellow_print.png'; New = 'home/yellow_print.png' }
    @{ Old = 'nuruk.jpg'; New = 'craft/nuruk.jpg' }
    @{ Old = 'pairing-fish.jpg'; New = 'taste/pairing-fish.jpg' }
    @{ Old = 'pairing-grilled-meat.png'; New = 'taste/pairing-grilled-meat.png' }
    @{ Old = 'pairing-gukhwajeon.png'; New = 'taste/pairing-gukhwajeon.png' }
    @{ Old = 'pairing-icon-gukhwajeon.png'; New = 'taste/pairing-icon-gukhwajeon.png' }
    @{ Old = 'pairing-icon-meat.png'; New = 'taste/pairing-icon-meat.png' }
    @{ Old = 'pairing-icon-seafood.png'; New = 'taste/pairing-icon-seafood.png' }
    @{ Old = 'pairing-icon-shabu.png'; New = 'taste/pairing-icon-shabu.png' }
    @{ Old = 'pairing-icon-yukhoe.png'; New = 'taste/pairing-icon-yukhoe.png' }
    @{ Old = 'pairing-jeon.jpg'; New = 'taste/pairing-jeon.jpg' }
    @{ Old = 'pairing-screen-2.png'; New = 'taste/pairing-screen-2.png' }
    @{ Old = 'pairing-screen-3.png'; New = 'taste/pairing-screen-3.png' }
    @{ Old = 'pairing-seafood.jpg'; New = 'taste/pairing-seafood.jpg' }
    @{ Old = 'pairing-seafood.png'; New = 'taste/pairing-seafood.png' }
    @{ Old = 'pairing-shabu-shabu.png'; New = 'taste/pairing-shabu-shabu.png' }
    @{ Old = 'pairing-tofu.jpg'; New = 'taste/pairing-tofu.jpg' }
    @{ Old = 'pairing-yukhoe.png'; New = 'taste/pairing-yukhoe.png' }
    @{ Old = 'pear.jpg'; New = 'craft/pear.jpg' }
    @{ Old = 'plan_taste.png'; New = 'taste/plan_taste.png' }
    @{ Old = 'rice.jpg'; New = 'craft/rice.jpg' }
    @{ Old = 'sea.mp4'; New = 'home/sea.mp4' }
    @{ Old = 'shop.jpg'; New = 'experience/shop.jpg' }
    @{ Old = 'start.png'; New = 'craft/start.png' }
    @{ Old = 'taste-pairing.jpg'; New = 'taste/taste-pairing.jpg' }
    @{ Old = 'taste-title-pairing-1920x1080.png'; New = 'taste/taste-title-pairing-1920x1080.png' }
    @{ Old = 'temper.svg'; New = 'taste/temper.svg' }
    @{ Old = 'waiting.png'; New = 'craft/waiting.png' }
)
$deleted = 0
foreach ($pair in $pairs) {
    $oldPath = Join-Path $imagesRoot ($pair.Old.Replace("/", [IO.Path]::DirectorySeparatorChar))
    $newPath = Join-Path $imagesRoot ($pair.New.Replace("/", [IO.Path]::DirectorySeparatorChar))
    if (-not (Test-Path -LiteralPath $oldPath -PathType Leaf)) { continue }
    if (-not (Test-Path -LiteralPath $newPath -PathType Leaf)) {
        Write-Warning "New file is missing: $newPath. Kept $oldPath"
        continue
    }
    if ((Get-FileHash -LiteralPath $oldPath -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $newPath -Algorithm SHA256).Hash) {
        Write-Warning "Asset was changed: $oldPath. Not deleted."
        continue
    }
    Remove-Item -LiteralPath $oldPath
    $deleted++
}
foreach ($directory in @( "mosaic", "logo", "brandcolor" )) {
    $oldDir = Join-Path $imagesRoot $directory
    if ((Test-Path -LiteralPath $oldDir -PathType Container) -and
        -not (Get-ChildItem -LiteralPath $oldDir -Force | Select-Object -First 1)) {
        Remove-Item -LiteralPath $oldDir
    }
}
Write-Host "Finished checking moved assets. Deleted $deleted matching old files."
