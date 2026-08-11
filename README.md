# Batch Image Watermark

一个用于给图片添加文字或 Logo 水印的 Codex Skill，包含自动批处理脚本和本地可视化网页。图片只在本机处理，不覆盖原图。

## 功能

- 批量处理单张图片或整个文件夹
- 内置“水印工坊”网页，支持实时预览和 ZIP 下载
- 支持文字水印和图片 Logo 水印
- 支持单个水印与平铺水印
- 支持透明度、旋转角度、排列间距、位置和边距
- 支持按比例设置字号和 Logo 宽度，适应不同分辨率
- 支持递归处理子文件夹并保留目录结构
- 支持 PNG、JPEG 输出及常见图片格式输入
- 处理完成后校验输出文件是否可以正常解码
- 始终输出到新目录，不修改源文件

## 仓库结构

```text
.
├── SKILL.md
├── requirements.txt
├── agents/
│   └── openai.yaml
├── assets/
│   └── watermark-studio/
│       ├── index.html
│       ├── styles.css
│       ├── app.js
│       └── vendor/jszip.min.js
└── scripts/
    ├── watermark.py
    └── serve_web.py
```

## 安装为 Codex Skill

使用 Skills CLI 全局安装：

```bash
npx -y skills add https://github.com/ooooovoooooo/batch-image-watermark \
  --skill batch-image-watermark \
  --agent codex \
  --global \
  --yes
```

安装完成后，重新打开 Codex，并在提示中明确使用：

```text
$batch-image-watermark
```

## 在 Codex 中使用

文字水印示例：

```text
使用 $batch-image-watermark，给这个文件夹中的全部图片添加文字水印“禁止外传”，透明度 35%，旋转角度 315°，平铺排列。保留原图，把结果输出到新文件夹。
```

Logo 水印示例：

```text
使用 $batch-image-watermark，把这个 PNG Logo 添加到所有商品图片右下角，Logo 宽度为图片宽度的 18%，透明度 80%，不要覆盖原图。
```

递归处理示例：

```text
使用 $batch-image-watermark，递归处理这个素材文件夹及其子文件夹，添加“仅供预览”文字水印，并保留原来的目录结构。
```

也可以直接告诉 Codex：

```text
使用 $batch-image-watermark，打开本地水印网页。
```

## 启动本地网页

网页模式不需要安装 Pillow，只需要 Python 3.9 或更高版本。在仓库目录运行：

```bash
python3 scripts/serve_web.py
```

浏览器会自动打开 [http://127.0.0.1:8127/](http://127.0.0.1:8127/)。如果没有自动打开，可以手动访问这个地址。使用期间请保持命令窗口运行，结束时按 `Ctrl+C`。

网页中的图片处理完全在浏览器本地完成，不会上传到服务器。默认地址仅限当前电脑访问。

## 手动批处理

### 1. 准备环境

需要 Python 3.9 或更高版本。建议使用独立虚拟环境：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

### 2. 添加文字水印

```bash
.venv/bin/python scripts/watermark.py \
  --input "/absolute/path/to/images" \
  --output "/absolute/path/to/images-watermarked" \
  --text "禁止外传" \
  --font-ratio 0.05 \
  --color "#FFFFFF" \
  --opacity 35 \
  --rotation 315 \
  --layout tile \
  --gap 0.10
```

### 3. 添加 Logo 水印

建议使用透明背景 PNG：

```bash
.venv/bin/python scripts/watermark.py \
  --input "/absolute/path/to/images" \
  --output "/absolute/path/to/images-watermarked" \
  --logo "/absolute/path/to/logo.png" \
  --logo-width 0.18 \
  --opacity 80 \
  --rotation 0 \
  --layout single \
  --position bottom-right \
  --margin 0.03
```

## 主要参数

| 参数 | 说明 |
| --- | --- |
| `--input` | 输入图片或文件夹，必填 |
| `--output` | 独立输出目录，必填且不能与输入相同 |
| `--text` | 文字水印，与 `--logo` 二选一 |
| `--logo` | 图片 Logo，与 `--text` 二选一 |
| `--opacity` | 透明度，范围 0–100 |
| `--rotation` | 旋转角度，支持任意度数 |
| `--layout` | `single` 或 `tile` |
| `--gap` | 平铺间距，占图片短边的比例 |
| `--position` | 单个水印的位置 |
| `--font-size` | 固定文字像素大小 |
| `--font-ratio` | 字号占图片短边的比例 |
| `--logo-width` | Logo 宽度占图片宽度的比例 |
| `--margin` | 单个水印距边缘的比例 |
| `--format` | `preserve`、`png` 或 `jpeg` |
| `--quality` | JPEG 质量，范围 1–100 |
| `--recursive` | 递归处理子文件夹 |

查看全部参数：

```bash
.venv/bin/python scripts/watermark.py --help
```

## 安全与隐私

- 所有图片均在本机处理，不会由脚本上传到服务器。
- 源文件不会被覆盖。
- 输出目录不能与输入路径相同。
- 处理后的新图片不保证保留原文件的全部元数据。
- 对大量或尺寸差异明显的图片，建议先处理一张代表图片检查效果。

## 测试状态

已在 macOS 上使用 Python 3.9 和 Pillow 11.3 完成真实图片测试：

- 文字平铺水印生成成功
- 输出文件解码检查通过
- 原图测试前后哈希一致

## License

本项目采用 [MIT License](LICENSE) 开源许可证。
