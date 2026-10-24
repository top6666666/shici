# ============================================================
# 中原诗旅智导 · 后端接口测试脚本（Windows PowerShell 7）
# 用法：
#   1) 先启动后端（在 backend 目录）：
#      D:\python\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
#   2) 另开一个终端运行本脚本：
#      powershell -ExecutionPolicy Bypass -File .\test_api.ps1
# 说明：正常问答与 10+ 问题质量测试需要 backend/.env 中已填写真实
#       DASHSCOPE_API_KEY；错误场景测试不依赖密钥。
# ============================================================
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8000"
$script:pass = 0
$script:fail = 0

function Show([string]$name, [bool]$ok, [string]$extra) {
    $mark = if ($ok) { "[PASS]" } else { "[FAIL]" }
    Write-Host ("{0} {1}  {2}" -f $mark, $name, $extra)
    if ($ok) { $script:pass++ } else { $script:fail++ }
}

function Get-StatusCode($ex) {
    try { return [int]$ex.Exception.Response.StatusCode } catch { return 0 }
}

function Post-Ask([string]$json) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    return Invoke-RestMethod -Uri "$base/api/poetry/ask" -Method Post `
        -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 60
}

Write-Host "==================== 0. 健康检查 ===================="
try {
    $r = Invoke-RestMethod -Uri "$base/" -Method Get -TimeoutSec 10
    Show "GET / 健康检查" ($r.status -eq "ok") ("-> status=" + $r.status + " model=" + $r.model + " key_configured=" + $r.key_configured)
} catch {
    Show "GET / 健康检查" $false ("无法连接服务，请先启动后端: " + $_.Exception.Message)
}

Write-Host "==================== 1. 正常问答 ===================="
try {
    $r = Post-Ask '{"question":"《春晓》的作者是谁？这首诗表达了什么？","conversation_id":""}'
    $ok = $r.code -eq 0 -and $r.data.answer -and $r.data.sources.Count -eq 0 -and $r.data.conversation_id
    $snip = if ($r.data.answer) { $r.data.answer.Substring(0, [Math]::Min(40, $r.data.answer.Length)) } else { "" }
    Show "正常问答（需密钥）" $ok ("-> code=" + $r.code + " conv=" + $r.data.conversation_id + " answer=" + $snip + "...")
} catch {
    Show "正常问答（需密钥）" $false ("HTTP " + (Get-StatusCode $_) + " " + $_.ErrorDetails.Message)
}

Write-Host "==================== 2. 空问题 / 缺失字段 / 无效JSON ===================="
try {
    $r = Post-Ask '{"question":"   ","conversation_id":""}'
    Show "空问题" $false ("应返回 4xx，实际 code=" + $r.code)
} catch {
    Show "空问题" ((Get-StatusCode $_) -ge 400 -and (Get-StatusCode $_) -lt 500) ("-> HTTP " + (Get-StatusCode $_) + " " + $_.ErrorDetails.Message)
}

try {
    $r = Post-Ask '{"conversation_id":"abc"}'
    Show "缺少 question 字段" $false ("应返回 4xx，实际 code=" + $r.code)
} catch {
    Show "缺少 question 字段" ((Get-StatusCode $_) -ge 400 -and (Get-StatusCode $_) -lt 500) ("-> HTTP " + (Get-StatusCode $_) + " " + $_.ErrorDetails.Message)
}

try {
    $r = Post-Ask '{这不是合法JSON'
    Show "无效 JSON" $false ("应返回 4xx，实际 code=" + $r.code)
} catch {
    Show "无效 JSON" ((Get-StatusCode $_) -ge 400 -and (Get-StatusCode $_) -lt 500) ("-> HTTP " + (Get-StatusCode $_) + " " + $_.ErrorDetails.Message)
}

Write-Host "==================== 3. conversation_id 沿用 ===================="
try {
    $r = Post-Ask '{"question":"李商隐是哪里人？","conversation_id":"demo-conv-001"}'
    Show "conversation_id 沿用" ($r.data.conversation_id -eq "demo-conv-001") ("-> conv=" + $r.data.conversation_id)
} catch {
    Show "conversation_id 沿用" $false ("HTTP " + (Get-StatusCode $_) + " " + $_.ErrorDetails.Message)
}

Write-Host "==================== 4. 10+ 诗词问题质量验证 ===================="
$questions = @(
    "《静夜思》的作者是谁？'床前明月光'中的'床'一般指什么？",
    "杜甫为什么被称为'诗圣'？他和河南有什么关系？",
    "李商隐的《锦瑟》表达了怎样的情感？",
    "《诗经·卫风·淇奥》和河南哪个地方有关？",
    "'洛阳亲友如相问'的下一句是什么？作者是谁？",
    "请推荐一条适合亲子研学的洛阳诗词一日游路线。",
    "背诵三句带'月'的唐诗并说明出处。",
    "李白和杜甫合称什么？两人的诗歌风格有何不同？",
    "《早发白帝城》表达了诗人怎样的心情？",
    "学习古诗词对小学生有什么好处？",
    "龙门石窟和诗词文化有什么关系？",
    "《春望》中'感时花溅泪'表达了作者什么情感？"
)
foreach ($q in $questions) {
    $body = @{ question = $q; conversation_id = "quality-test" } | ConvertTo-Json -Compress
    try {
        $r = Post-Ask $body
        $snip = if ($r.data.answer) { $r.data.answer.Substring(0, [Math]::Min(36, $r.data.answer.Length)) } else { "" }
        Show ("问答: " + $q.Substring(0, [Math]::Min(16, $q.Length))) ($r.code -eq 0 -and $r.data.answer) ("-> " + $snip + "...")
    } catch {
        Show ("问答: " + $q.Substring(0, [Math]::Min(16, $q.Length))) $false ("HTTP " + (Get-StatusCode $_) + " " + $_.ErrorDetails.Message)
    }
}

Write-Host ""
Write-Host ("==================== 结果：通过 {0} 项，失败 {1} 项 ====================" -f $script:pass, $script:fail)
if ($script:fail -gt 0) { exit 1 } else { exit 0 }
