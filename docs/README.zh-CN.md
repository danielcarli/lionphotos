<div align="center">

<img src="../src/workbench/browser/media/logo.svg" width="96" height="96" alt="LionPhotos 标志">

# LionPhotos

### 你拍过的每一张照片，几秒内就能找到。

在照片和视频原本所在的位置——本机磁盘、外置硬盘或云端文件夹——浏览、搜索和整理海量收藏。快速、私密、免费。

<sub>由 <b>LionPhotos Team</b> 开发 · 由 <b>Daniel Michelon De Carli</b> 创建和构思 · <a href="https://github.com/danielcarli/lionorganizer">LionOrganizer</a> 的姊妹软件</sub>

[English](../README.md) · [Português (Brasil)](README.pt-BR.md) · [Português (Portugal)](README.pt-PT.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · **简体中文** · [日本語](README.ja.md) · [한국어](README.ko.md)

<p>
  <a href="https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-Setup.exe"><img src="https://img.shields.io/badge/Windows-%E4%B8%8B%E8%BD%BD%20.exe-0194b2?style=for-the-badge&labelColor=161214" alt="Windows .exe"></a>
  <a href="https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-mac-universal.dmg"><img src="https://img.shields.io/badge/macOS-%E4%B8%8B%E8%BD%BD%20.dmg-0194b2?style=for-the-badge&labelColor=161214" alt="macOS .dmg"></a>
  <a href="https://github.com/danielcarli/lionphotos/releases/latest/download/lionphotos_amd64.deb"><img src="https://img.shields.io/badge/Linux-%E4%B8%8B%E8%BD%BD%20.deb-0194b2?style=for-the-badge&labelColor=161214" alt="Linux .deb"></a>
  <a href="https://github.com/danielcarli/lionphotos/releases/latest/download/lionphotos.x86_64.rpm"><img src="https://img.shields.io/badge/Linux-%E4%B8%8B%E8%BD%BD%20.rpm-0194b2?style=for-the-badge&labelColor=161214" alt="Linux .rpm"></a>
  <a href="https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-x86_64.AppImage"><img src="https://img.shields.io/badge/Linux-%E4%B8%8B%E8%BD%BD%20AppImage-0194b2?style=for-the-badge&labelColor=161214" alt="Linux AppImage"></a>
</p>

<a href="https://github.com/danielcarli/lionphotos/releases/latest"><img src="https://img.shields.io/github/v/release/danielcarli/lionphotos?label=%E6%9C%80%E6%96%B0%E7%89%88%E6%9C%AC&color=e5307a&labelColor=161214" alt="最新版本"></a>

<sub><a href="https://github.com/danielcarli/lionphotos/releases">所有版本</a> · <a href="#下载">如何安装</a></sub>

<img src="screenshots/photos-grid.webp" alt="LionPhotos：带文件夹树和信息面板的照片网格" width="900">

**无需导入** · **数据不出本机** · **10 万张照片如 100 张般流畅** · **免费开源**

![版本 1.73.0](https://img.shields.io/badge/version-1.73.0-161214)
![状态：Beta 测试](https://img.shields.io/badge/status-beta%20test-e5307a)
![许可证：MIT](https://img.shields.io/badge/license-MIT-0194b2)
![平台：Windows、macOS、Linux](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-161214)
![Electron](https://img.shields.io/badge/Electron-45-eecd25)
![界面语言：10](https://img.shields.io/badge/UI%20languages-10-e5307a)

</div>

> **Beta 测试。** LionPhotos 已可日常使用，并在约 15,000 张照片和视频的真实收藏上测试，但仍处于 Beta 阶段：可能还有不完善之处；第一次重新整理收藏之前，请先备份。[这里的 Beta 是什么意思](#beta-测试)。

**功能覆盖令人印象深刻。** LionPhotos 已经把 Lightroom“图库”模块的核心（目录、标记、IPTC、RAW+JPEG、无损调整）与 Google 相册的精华（人物、宠物、按内容搜索、相似照片堆叠）结合在一起。此外还有待删区（Limbo）、自有品牌插件和 10 种语言。

**源自真实使用。** 许多功能都来自拍照者遇到的真实问题：缓慢的 Google 云端硬盘、RAW+JPEG、丢弃照片前比较元数据。这样做出的软件往往实用，而不只是好看。

**在大型照片集上测试。** LionPhotos 正在一个存放于 USB 3.1 外置硬盘、超过 7 万张照片的照片集上测试，界面依然易于浏览、流畅；只是为整个照片集生成缩略图需要更多时间。

## 实际效果

照片收藏增长的速度总是快过整理的速度：多年的拍摄散落在各个文件夹和移动硬盘里，同一张照片存了三份，RAW 文件大多数看图软件打不开，而整理的成果又被锁在某一台电脑的某一个软件里。LionPhotos 正是为此而做：

### 文件夹，保持原样

> *“打开收藏要等很久。”*

不导入，也不复制你的照片：LionPhotos 直接浏览原有的文件夹，每张缩略图只生成一次，文件改变时才重做。10 万项滚动起来和 100 项一样流畅。

相册、人物、标记、描述、调整和裁剪也保存在收藏内的一个隐藏文件夹中，同一块移动硬盘在另一台电脑上、无论盘符是什么，打开后一切都在。

<p align="center"><img src="screenshots/photos-list.webp" alt="列表" width="860"><br><sub><b>列表</b> — 文件夹、类型、尺寸、大小、日期</sub></p>

### 任何照片，几秒找到

> *“找不到那张照片。”*

按名称、文件夹、相机、作者、描述、相册、项目、人物、宠物或地点搜索。人脸和宠物在你的电脑上识别，地点会根据 GPS 或照片里写的地点自动填好。 也可以直接按照片内容搜索：输入“海滩”“狗”或“生日派对”。

<p align="center"><img src="screenshots/search.webp" alt="搜索" width="860"><br><sub><b>搜索</b> — 在标题栏中搜索整个收藏</sub></p>

### 每一次旅行，都在世界地图上

地点会根据 GPS 或照片里写的地名自动填写，并显示在本机绘制的世界地图上。点一下标记，那个地方的照片就都在那里。

<p align="center"><img src="screenshots/places-map.webp" alt="地点" width="860"><br><sub><b>地点</b> — 在本机绘制的世界地图上</sub></p>

### 几乎自动生成的相册

“建议相册”按拍摄顺序把照片分组，并依照片内容——海滩、婚礼、生日——命名，供你审阅。每个相册都有封面、描述和时间段，可用马赛克、整齐网格、列表或精选查看；加上铅笔，它就进入“待编辑”清单。

<p align="center"><img src="screenshots/albums.webp" alt="相册" width="49%"> <img src="screenshots/album.webp" alt="相册内部" width="49%"><br><sub><b>相册</b> — 按年份的马赛克，带描述 · <b>相册内部</b> — 马赛克、均匀网格、列表或精选</sub></p>

### 最好的照片，像作品集一样

浏览时用 `1` 和 `2` 标出最佳和可用的照片。“精选”只显示它们——相册、人物、地点和项目各占一行，选中的照片大幅展示——一页由你自己的标记组成的作品集。

<p align="center"><img src="screenshots/highlights.webp" alt="精选" width="860"><br><sub><b>精选</b> — 只显示星标和 OK 的照片，像作品集一样</sub></p>

### 快速编辑，原图不动

曝光、色彩、黑白、裁剪、拉直、镜头与透视校正、RAW 显影——在显卡上实时完成。一切都保存在目录中：文件从不改变，按 `\` 随时查看原图。

<p align="center"><img src="screenshots/viewer.webp" alt="查看器" width="49%"> <img src="screenshots/lens.webp" alt="镜头校正" width="49%"><br><sub><b>查看器</b> — 带编辑面板（黑白） · <b>镜头校正</b> — 手动校正透视</sub></p>

### 一键适配各个平台

> *“我要交付作品。”*

快速编辑和适配各个社交网络的裁剪，为无障碍准备的说明文字和音频描述，以及统一文件名、可选元数据的导出。原始文件永远不变。

<p align="center"><img src="screenshots/crop.webp" alt="裁剪" width="49%"> <img src="screenshots/export.webp" alt="导出照片" width="49%"><br><sub><b>裁剪</b> — 适合 Instagram、快拍、YouTube 等 · <b>导出照片</b> — 统一命名，适配各平台尺寸</sub></p>

### 人人都能读懂的描述

标题、说明、音频描述、作者和地点，一张或一百张一次完成——边输入边保存，其他软件也能读取（IPTC 和 XMP），只有在你要求时才写入文件。

<p align="center"><img src="screenshots/metadata.webp" alt="描述" width="860"><br><sub><b>描述</b> — IPTC 元数据，输入即保存</sub></p>

### 放心释放空间

> *“磁盘里塞满了不需要的东西。”*

边看边标记废片并送进 Limbo；按内容找出重复文件。所有删除都经过回收站，绝不永久删除。

<p align="center"><img src="screenshots/duplicates.webp" alt="重复文件" width="860"><br><sub><b>重复文件</b> — 按内容查找</sub></p>

### 整理磁盘——随时可撤销

> *“文件夹一团乱。”*

*重新整理收藏* 会读取现有文件夹，在磁盘上提出一个清晰的结构（`2025/2025-12-24-圣诞节`、主题、待整理、相机测试），在移动任何东西之前供你审阅——而且一切都可以撤销。

<p align="center"><img src="screenshots/reorganize.webp" alt="重新整理收藏：在移动任何东西之前，逐个文件夹查看建议" width="860"></p>

**准备好重新找到你的照片了吗？** [下载 LionPhotos](#下载)，支持 Windows、macOS 和 Linux——免费、无需账号、10 种语言。

## 为什么选择 LionPhotos

- **就用你现有的文件夹。** 不导入，没有封闭的图库：照片留在你放的地方，其他软件照常使用它们。
- **本地且私密。** 无账号、无遥测；只有在你让它检查新版本时才会联网。人脸和宠物识别在你的电脑上运行。只读取你选择的文件夹及其子文件夹。
- **多大的收藏都快。** 网格只绘制屏幕上可见的部分；缩略图很小，存放在一个缓存文件中，只生成一次。移动硬盘上的大型收藏依然流畅。
- **支持各种格式，自带解码器。** JPEG、HEIC/HEIF、TIFF、PSD/PSB、各大品牌的 RAW（CR3、CR2、NEF、ARW、RAF、DNG…）以及视频（MP4、MOV、MTS、AVI…）。
- **安全是设计的一部分。** 每次修改文件都会先展示计划，要求手动输入 3 个字符的代码，并且可以撤销；删除总是进入回收站。
- **目录随照片一起走，** 采用开放、有文档的 JSON 格式，其他软件也能读取。
- **真正地整理。** 目录中的相册、项目、人物、宠物和地点——需要时还有磁盘上的文件夹和文件名，同一次拍摄的 RAW、JPEG 和附属文件始终在一起。
- **免费开源**（MIT），支持 Windows、macOS 和 Linux，10 种界面语言。

## 适合谁

- **职业和业余摄影师**：作品存放在文件夹和移动硬盘中，拍 RAW + JPEG，希望不把一切导入目录也能整理、查找和交付。
- **传播团队、编辑部和工作室**：在多台电脑、多个人之间共享收藏，需要统一的文件名、署名和无障碍描述，并按项目和客户组织工作。
- **家庭以及手机里攒了多年照片的人**：照片散落在各处文件夹，想重新找到人物、地点和时刻，并安全地释放空间。
- **重视隐私的人**：不上传任何东西，没有账号，不经过网络。

## 它是什么，以及它不是什么

LionPhotos 是一个**整理工具和目录**。它的主要功能是把工作整理好，并维护一个简单、易用、直观的目录：找到照片、筛选一次拍摄、建立相册和项目，并交付成果。

它也能**编辑和校正**，用于大多数照片所需的快速、轻量的处理——曝光、色彩、黑白、裁剪和校正水平、镜头校正、RAW 显影——在这方面它已经相当能干，出结果也快。

它**并不打算取代 Lightroom、Photoshop 以及其他专门用于数码照片显影的编辑器**。使用处理图层的工作、局部修饰和合成，交给那些更专业的软件；LionPhotos 可以在其中打开照片（*打开方式*），并把结果带回目录。

## 下载

下载适合你系统的安装程序。链接始终指向**最新版本**，每个文件都会被校验（SHA-256 和签名的构建来源证明）。

- **Windows 10/11**（x64、ARM）：包含完整应用的安装程序（约 150 MB），安装时不下载任何内容，几秒即可完成。→ [`LionPhotos-Setup.exe`](https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-Setup.exe) · [ARM](https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-Setup-arm64.exe) · [免安装 `.zip`](https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-win-x64.zip)
- **macOS 11+**（Apple 芯片、Intel）：打开 `.dmg`，把 LionPhotos 拖到“应用程序”。→ [`LionPhotos-mac-universal.dmg`](https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-mac-universal.dmg)
- **Linux**（x64）：适用于 Ubuntu、Debian、Mint… 的 `.deb`，适用于 Fedora、RHEL、openSUSE… 的 `.rpm`，或无需安装、适用于任何发行版的 AppImage。→ [`.deb`](https://github.com/danielcarli/lionphotos/releases/latest/download/lionphotos_amd64.deb) · [`.rpm`](https://github.com/danielcarli/lionphotos/releases/latest/download/lionphotos.x86_64.rpm) · [AppImage](https://github.com/danielcarli/lionphotos/releases/latest/download/LionPhotos-x86_64.AppImage)

> 安装程序尚未使用付费证书签名。首次启动时，Windows 可能显示“Windows 已保护你的电脑”（**更多信息 › 仍要运行**），macOS 会要求你在**系统设置 › 隐私与安全性 › 仍要打开**中允许该应用。

**更喜欢终端？** macOS 和 Linux：

```bash
curl -fsSL https://github.com/danielcarli/lionphotos/releases/latest/download/install.sh | bash
```

[所有版本](https://github.com/danielcarli/lionphotos/releases) · [安装指南](INSTALL.md)（英文）：详细信息、安全机制、更新和卸载。

## Beta 测试

LionPhotos 处于 **Beta** 阶段。这意味着：

- 它每天都在一个真实收藏上使用，每个版本都通过 100 多项自动化端到端检查，但还没有在许多不同的电脑和收藏上使用过。
- **在普通硬盘上用大型照片集测试：** 在一块 USB 3.1 外置机械硬盘（普通硬盘，不是 SSD）上的 7 万多个文件。在这项测试中，性能表现令人满意。
- 第一次整理、重命名或重新整理收藏之前，**请先备份**（“备份”标签页可以完成）。所有操作都可以撤销，也不会永久删除任何东西，但备份才是最稳妥的保障。
- 安装程序尚未使用付费证书签名（见[下载](#下载)）。
- RAW 照片默认基于相机存放在其中的 JPEG（8 位）编辑；**显影模式**（调整中的开关）则编辑传感器数据，在本机用 LibRaw 以 16 位显影——这是新功能，仍在调校（颜色既不同于相机，也不同于 Lightroom）。需要支持 WebGL 2 的显卡。
- 发现问题或有建议？请提交一个 [issue](https://github.com/danielcarli/lionphotos/issues)，写明版本（状态栏中显示）以及你做了什么。LionPhotos 从不自行发送任何内容。

## 功能

| | |
|---|---|
| **照片** | 按月网格，或带文件夹、类型、尺寸、大小、日期和详细信息的列表；单击、Ctrl 和 Shift 选择；缩放；按类型、年份、标记、分类和子文件夹筛选，筛选条件以标签显示，点一下即可去掉。左侧是文件夹树（或年份），右侧是信息面板——都可隐藏，专注模式（`\`）下全部隐藏。**标题栏搜索**（Ctrl+K 或 Ctrl+F）边输入边搜索整个收藏——照片、相册、项目、人物、地点、摄影师、相机、关键词、文件夹；当筛选条件隐藏了全部内容时，页面会指出是哪些，并提供逐个去掉的按钮。在相册、人物、宠物、地点或项目中：马赛克、均匀网格、列表或精选。 |
| **查看器** | 立即显示原图大小（先显示缩略图），RAW 文件通过相机内嵌的 JPEG 以原尺寸显示，← → 切换，`I` 显示信息，缩放到实际大小；视频带控制条播放。缩放滑块从适应屏幕到 400%；滚轮在指针处缩放，拖动可移动照片，`Z` 在适应屏幕与实际大小之间切换。*编辑*（或 `H`）显示或收起与信息面板相同的编辑面板——类别、相册、调整、描述、作者和地点；被移到筛选之外类别的照片会继续显示，标题变灰，并提示它现在所在的类别。HEIC、HEIF 和 HIF 也能以实际大小打开；HDR 照片（PQ、HLG）会在查看器和缩略图中转换为普通屏幕显示。双击在点击处放大到 100%，再双击恢复。按 Delete 只需简单确认即可将照片送到待删区。 面板一次只显示一项任务——调整、描述、信息；窗口宽度达到 1680 像素时，左侧为描述和信息，右侧为调整；拖动面板边缘可调整宽度。 |
| **调整** | 在信息面板中调整曝光、对比度、阴影和饱和度，可用于一张或多张照片，带直方图和即时预览（使用显卡，没有时使用处理器）；可复制并粘贴到其他照片。文件永不改变：调整保存在目录中（Ctrl+Z 撤销），缩略图和查看器会显示调整效果（按住 `\` 查看原图），*保存编辑副本* 会在原图旁写入带元数据的新 JPEG。 “导出照片”（Ctrl+E）可将编辑后的照片在任意文件夹中生成新文件——JPEG、PNG 或 TIFF，社交网络或冲印尺寸，输出锐化，文件名如 `2026-07-24-Biye-Ana-Souza-001.jpg`，包含全部元数据或去掉位置，可选文字署名——并嵌入 sRGB 配置文件；原图永不改变。 |
| **编辑** | 高光、白色、黑色、白平衡（色温、色调和吸管）、鲜艳度、按颜色混合的黑白、暗角，以及（在显卡上的）锐化、纹理和清晰度；*自动*、预设，以及查看器中的前后对比（`Y`）。**裁剪和拉直**（`C`）：自由或按比例——常用比例和社交网络比例（Instagram 4:5 和 3:4、快拍/Reels/TikTok 9:16、YouTube 16:9、链接 1.91:1、Pinterest、X 和 LinkedIn 封面）——90° 旋转，以及沿地平线画线拉直。一切都保存在目录中；文件从不改变。 |
| **镜头校正** | 按镜头配置文件消除畸变、暗角和色差——完整的 [Lensfun](https://lensfun.github.io) 数据库（约 1600 支镜头），按相机记录的名称自动匹配，或在可搜索的列表中选择——还可手动校正：畸变、垂直与水平透视（向后倾倒的建筑）、缩放、四角和色差。在显卡上处理；文件不会改变。 |
| **回收站记录** | 工具 › *回收站记录*（`Ctrl+5`）列出 LionPhotos 移到回收站的每个文件——时间、文件、大小和来源（待定区、重复文件、选择）——并报告待定区释放的空间：总计、本月和按月。 |
| **信息面板** | 选中项的全部元数据、类别，以及它所属的相册、人物、宠物、地点和项目，可直接在此添加或移除。 |
| **描述和元数据** | 标题、说明、音频描述、作者及职务、地点（具体地点、城市、省/州、国家）、关键词和说明事项，可为一张或多张照片同时填写——只更改目录。文件中已有的信息（EXIF、IPTC、XMP、RAW 的 `.xmp`）作为提示显示，并用于导出。*写入文件*（需输入确认码）会写进 JPEG 本身，旧版本移到回收站；其他文件则写入旁边的 `.xmp`。 JPEG 也会在旁边写入同样的 `.xmp`：发送时数据随照片一起，旁边也能读取。每次更改都可撤销（Ctrl+Z）和重做（Ctrl+Shift+Z）；写入文件可从通知或最近的操作中撤销，文件逐字节恢复。 |
| **相册** | 封面、描述和时间段；任何选择都可*添加到相册…*，*从相册移除*，*设为封面*；**根据文件夹创建相册**（第一层、含照片的文件夹或自选），与整个文件夹关联；全屏幻灯片放映。**推荐相册**：按拍摄的时间段将照片分组，并根据文件夹、照片内容（在本机根据缩略图读取：海滩、山、蛋糕、婚纱、美食……）、按日期识别的节日、地点和人物命名；还会推荐跨年份的主题相册，创建前可查看。 **合并两个相册**（两者的照片，使用您选择的名称；只改变目录，可撤销）。可用拼贴、均匀网格（所有封面同样大小）、列表或精选方式查看。 |
| **项目、人物、宠物、地点** | 各在自己的标签页，以网格或按年份分组的列表显示。打开后在其标签页下显示它的照片；一键即可把照片移出。文件夹的标签适用于其中的所有内容。 项目可以包含多个相册，并有一张信息卡（状态、客户、地点、团队、截止日期）和进度面板：已筛选、已编辑、选入相册、音频描述。 地点会根据照片自动填写（GPS 位置或照片中写的地点），并显示在本机绘制的**世界地图**上。 |
| **待编辑** | 点击相册或项目封面上的铅笔，它就会进入 **待编辑** 标签页（Ctrl+Shift+E）——按要做的先后排列的列表：拖动行，或用箭头、Alt+↑ ↓，把最先要做的放在最前面。列表中的位置显示在封面上，项目会显示截止日期（逾期为红色），“完成”会取下铅笔。只更改目录，列表随收藏一起带走。 |
| **名称和标志** | “设置 › 名称和标志”可把你自己的名称和标志（机构、工作室或课程的）放到标题栏、欢迎页和窗口标题中，并可预览。自己的名称旁总会显示 **Powered by LionPhotos**；“关于”保留署名。标志（PNG、JPG、WebP、SVG）会完整放入正方形；“恢复为 LionPhotos”即可撤销。保存在这台电脑上。 插件在启用时也可以设置名称和标志（其 `plugin.json` 中的 `brand`）；你自己设置的优先。 |
| **人脸和宠物** | 人脸用 face-api（TensorFlow.js），动物用 COCO-SSD 和 MobileNet，在显卡上运行（WebGL）。相似人脸分组，推荐由你确认或拒绝，“不是此人”会被记住。默认关闭；可*立即建立索引*或在每次扫描后自动进行。 |
| **标记和待删区** | 很好、可以、待删除 — 在缩略图、列表、查看器和信息面板中均可标记；按键 `1` `2` `3` `0`。待删区显示所有待删除项及其占用空间，并可一次性移到回收站。 **精选**：相册、人物、宠物和项目只显示标为星标或 OK 的照片，每行一项——大号名称、一张大幅精选照片——就像作品集页面。地点也一样；进入其中任一项，也能以大图逐行查看精选照片。 |
| **打开方式** | 为所选文件列出电脑上的照片和视频程序（Photoshop、Lightroom Classic、Bridge、Premiere Pro、Capture One、DxO PhotoLab、Affinity、darktable、GIMP、VLC…），最近使用的在前；在 Windows 上还包括为该文件类型注册的所有程序。 |
| **插件** | 安装 `.lionplugin` 软件包，将相册和项目导出为网页（HTML、CSS 和 JavaScript），包含文件名、描述和口述影像；它们不会在 LionPhotos 内运行。参见 [PLUGINS.md](PLUGINS.md)（英文）。 每个已启用的插件在“待编辑”之后都有自己的标签页：选择相册和项目即可导出。 |
| **概览** | 项目数、照片、视频、大小和时间段；按种类、按年份、格式、相机、编解码器统计文件；缩略图缓存。 |
| **整理** | 日期文件夹（`2024/2024-07`、`2024-07`、`2024`、`2024/2024-07-14` 或 `2024-07-14-主题`），按相册的文件夹（`2024/2024-07-14-相册`），可在其中分出 `Raw/` 和 `Img/`；*移动到文件夹*（按种类分子文件夹）；同一次拍摄的文件一起移动；最近操作可撤销。 文件会在磁盘上真正移动，也可以**重命名**（默认 `{data}-{álbum}-{fotógrafo}-{nº}`，按日期编号；同一张照片的 RAW、JPEG 和 `.xmp` 保持同名），或只在原处重命名。 “重新整理收藏”会读取现有文件夹并在磁盘上提出统一结构——`2025/2025-12-24-圣诞`、长期主题放在 `主题/`、待整理放在 `_待整理/`、相机测试放在 `_器材/`——先检查（可重命名或排除任何文件夹，预览整理后的目录树），再整体移动文件夹，并可撤消。**遗留的关联文件**（照片移动后单独留下的 `.xmp` 或 `.dop`）会回到照片旁，并使用照片的名称。 **复制一份**（Ctrl+D）：在照片旁创建副本，带上调整、裁剪、标记和相册（需输入确认码，可撤销）。 |
| **重复文件** | 分三步计算 SHA-256（大小 → 开头/结尾 64 KB → 整个文件），与缩略图并排显示。 每个副本都会显示保存所在的文件夹，可在 LionPhotos 或电脑的程序中打开、在文件夹中显示或复制路径；“并排比较”把保留的副本与另一个并排（视频在电脑的程序中打开）。选择另一个副本只移动标记，不改变副本顺序。 |
| **相似照片** | 按天将实际上是同一张图的照片（连拍、同一姿势拍了几次）根据缩略图在本机分组，并建议保留最清晰、曝光最好的一张。单击可切换每张照片保留或送出；其余的一起送入待删区，RAW 和 JPG 算作一张。三个级别：几乎相同、相似、同一场景。 也可以从“照片”栏中“仅显示不在相册中的照片”旁边使用：针对显示的照片（文件夹、年份、相册），跨越多天分组。 |
| **按照片内容搜索** | 输入“海滩”“狗”“生日派对”或“日落”，就能找到拍到这些的照片，无论文件名是什么。一个小模型（TinyCLIP，MIT）在分析“照片里有什么”时，于本机用处理器读取每张缩略图，并与 605 种场景、活动、物品和地点比对，这些名称涵盖应用的十种语言。信息面板显示照片里有什么；点击名称即可按它搜索。不下载也不发送任何内容。 |
| **备份** | 按内容比较主文件夹和备份文件夹；把缺少的内容经校验后复制到相同的子文件夹或日期文件夹中。 |
| **转换** | HEIC/HEIF → 全分辨率 JPG 或 PNG，保留 EXIF 和色彩配置文件，保存在原文件旁边。 |
| **格式** | 照片：JPEG、PNG、GIF、WebP、AVIF、BMP、HEIC/HEIF、TIFF、PSD/PSB、相机 RAW（CR3、CR2、NEF、NRW、ARW、SR2、ORF、RW2、RAF、SRW、PEF、DNG、3FR、IIQ、ERF、RWL）。视频：MP4、MOV、M4V、3GP、WebM、MKV、MTS/M2TS、AVI。 |
| **10 种语言** | English、Português (Brasil)、Português (Portugal)、Español、Français、Deutsch、Italiano、简体中文、日本語、한국어 — 跟随系统，可在状态栏切换。 |
| **主题** | 西瓜（标志的青色、粉色和白色）、城市蓝（如城市规划图般的钴蓝、珊瑚色和白色——默认）、浅色、深色和自动。 |

## 安全第一

与 LionOrganizer 相同的规则：

- **手动输入验证码。** 每次更改文件 — 移到回收站、整理、移动、重命名、转换、撤销、清除缓存 — 都会显示一个 3 位验证码，必须**手动输入**（禁止粘贴）。验证码由主进程生成和校验；输错五次即取消。
- **移到回收站，而不是永久删除。**
- **范围受限。** 界面只能通过已打开文件夹的图库 ID 访问文件，从不通过路径。
- **默认只读。** 浏览、元数据、缩略图、预览、重复文件检查和“打开方式”从不修改你的文件。相册、标签、标记和人脸只改变 LionPhotos 自己的目录。 唯一的例外：你对照片所做的也会以 JSON 写入收藏内的隐藏文件夹 `.lionphotos`（仅在做了改动之后；可在备份中关闭）。

## 键盘快捷键

| 快捷键 | 操作 |
|---|---|
| `Ctrl+O` | 打开文件夹 |
| `F5` | 查找新增和更改的文件 |
| `Ctrl+K` · `Ctrl+F` | 搜索整个收藏（标题栏） |
| `Ctrl+1` · `Ctrl+Shift+A` | 照片 · 相册 |
| `Ctrl+Shift+E` | 待编辑 |
| `Ctrl+6` … `Ctrl+9` | 项目 · 人物 · 宠物 · 地点 |
| `Ctrl+L` | 待删区 |
| `Ctrl+2` · `Ctrl+3` · `Ctrl+4` · `Ctrl+0` | 概览 · 重复文件 · 整理 · 备份 |
| `Alt+←` · `Alt+Home` | 从相册、项目或人物返回 · 整个收藏，不加筛选 |
| `Ctrl+B` · `\` | 显示/隐藏侧边栏 · 专注模式（只显示照片） |
| `1` `2` `3` · `0` | 把所选标记为很好 · 可以 · 待删除 · 清除标记 |
| `Ctrl+A` · `Enter` · `H` · `Delete` · `F2` · `Esc` | 全选 · 打开 · 信息面板 · 回收站 · 重命名 · 取消选择 |
| `E` · `D` · `I` | 侧面板切换到 调整 · 描述 · 信息（再按一次同一键收起） |
| `Ctrl+G` · `Ctrl+Shift+G` | 堆叠 · 取消堆叠所选项 |
| `V` · `?` | 并排比较 · 键盘快捷键 |
| `Ctrl+E` | 导出照片（所选照片，或显示的照片） |
| `←` `→` · `空格` · `Esc` | 查看器：上一张/下一张 · 播放/暂停 · 关闭 |
| `P` · `F` · `A` | 查看器：幻灯片 · 全屏 · 添加到相册 |

## 语言

| 语言 | 代码 | | 语言 | 代码 |
|---|---|---|---|---|
| English | `en` | | Deutsch | `de` |
| Português (Brasil) | `pt-BR` | | Italiano | `it` |
| Português (Portugal) | `pt-PT` | | 简体中文 | `zh-CN` |
| Español | `es` | | 日本語 | `ja` |
| Français | `fr` | | 한국어 | `ko` |

默认跟随系统语言，可在状态栏切换。数字和日期遵循所选语言。文本目录由 `tools/nls/*.py` 生成到 `src/nls/*.json`。

## 隐私

LionPhotos 只在你要求时才联网：点击右下角的版本号会在 GitHub 上检查新版本，更新时会下载适用于你系统的安装程序，并在使用前校验（SHA-256）。无需账户，没有遥测，不会发送任何关于你或你照片的信息。人脸和宠物识别在本机运行，使用应用自带的模型。

目录和缩略图保存在你电脑上的一个文件中：

```
%APPDATA%\LionPhotos\library.sqlite
```

*概览 › 清除缓存*会删除缩略图，绝不会影响你的照片。

## 快速开始

### 从源代码运行（Windows）

1. 安装 [Node.js LTS](https://nodejs.org)。
2. 下载或克隆本仓库。
3. 双击 **`start.bat`** — 首次运行会安装依赖。

或在终端中：

```powershell
npm install
npm start
```

### 构建安装程序

双击 **`build-installer.bat`**（或运行 `npm run dist`）。安装程序会生成在 `dist/` 中。推送 `vX.Y.Z` 标签时，GitHub Actions 会构建发布版本。

## 缩略图为何一直很快

1. **扫描** — 只扫描所选文件夹及其子文件夹，只用 `readdir` + `stat`；列出文件时从不打开文件内容。2 万个文件大约需要一秒。
2. **有效性** — 缩略图与其文件的大小和修改日期一起保存；只要两者一致就会复用。在应用外移动或重命名的文件仍保留其缩略图。
3. **顺序** — 先处理屏幕上的内容，再按从新到旧处理其余部分；所有缩略图完成后才生成视频预览。
4. **引擎** — 一个低优先级的隐藏页面用 LionPhotos 自己的代码解码一切：图片在 Web Worker 中处理，RAW 文件使用内嵌的 JPEG 预览，TIFF 和 PSD 只读取每 n 行中的一行，HEIC 使用 WebAssembly 版 libheif，视频使用 WebCodecs。从不调用操作系统的缩略图服务。
5. **存储** — 320 像素的 WebP 缩略图（8–25 KB）保存在一个 SQLite 文件中，没有孤立文件。

## 架构

与 [LionOrganizer](https://github.com/danielcarli/lionorganizer) 和 [Visual Studio Code](https://github.com/microsoft/vscode) 相同的分层：`base` 不依赖上层，`platform` 提供主进程服务，`workbench` 构建界面；沙箱化的界面只通过 `preload` 桥与主进程通信。

```
src/
  base/            事件、格式化、i18n、DOM 工具、图标、图表
  platform/
    library/       SQLite 目录、文件夹扫描、元数据读取（EXIF：JPEG、raw、HEIC、AVIF；PNG、MP4/MOV、Matroska）
    thumbs/        缩略图和预览引擎 + 隐藏页面（worker、WebM 封装）
    media/         lionthumb:// 和 lionmedia://（按图库 ID，支持字节范围）
    faces/         人脸和宠物识别（显卡上的隐藏页面，主进程中的身份匹配）
    labels/        相册、项目、人物、宠物、地点、个人/工作
    operations/    需输入验证码的操作：回收站、整理、移动、重命名、撤销、清除缓存
    openWith/      电脑上的照片和视频程序
    duplicates/    SHA-256 查找（与 LionOrganizer 共用）
  code/            electron-main 入口、preload 桥
  nls/             en.json … ko.json（由 tools/nls 生成）
  workbench/       布局部件、服务和视图
```

安全：启用 `contextIsolation` 和 `sandbox`，不启用 `nodeIntegration`，严格的内容安全策略，所有修改文件的请求都在主进程中校验。

## 开发

| 命令 | 作用 |
|---|---|
| `npm start` | 运行应用 |
| `npm run dist` | 构建安装程序 |
| `npm run test:e2e` | 在**一次性**文件夹上进行端到端测试（`npm run fixtures` 可生成一个） |
| `npm run test:i18n` | 所有用到的键都存在，每种语言都完整，占位符一致 |
| `npm run test:faces` | 用合成人脸测试身份匹配 |
| `npm run test:openwith` | “打开方式”：Windows 注册表、`.desktop` 文件、启动程序 |
| `npm run test:plugins` | Plugins |
| `npm run nls` | 由 `tools/nls/*.py` 生成 `src/nls/*.json` |
| `npm run release:assets` | 在 `dist-release/` 中生成安装程序使用的发布文件 |

```powershell
# 端到端测试会修改文件：务必指向一个一次性的副本
$env:LIONPHOTOS_FOLDER="C:\temp\photos-copy"; npm run test:e2e
```

## 更新日志

参见 [CHANGELOG.md](../CHANGELOG.md)（英文）— 当前版本：**1.73.0**。

## 致谢

LionPhotos 由建筑与城市规划专业学生 **Daniel Michelon De Carli 创建和构思**，由 **LionPhotos Team** 与贡献者和译者共同维护。

## 许可证

Copyright © 2026 LionPhotos Team.

LionPhotos 以 **[MIT 许可证](../LICENSE)** 开源：可以自由使用、复制、修改和分发，但须保留版权声明。本软件**按“原样”提供，不附带任何担保**。

随附的第三方组件保留各自的许可证：

| 组件 | 许可证 | 位置 |
|---|---|---|
| [libheif](https://github.com/strukturag/libheif) 及 libde265（[libheif-js](https://github.com/catdad-experiments/libheif-js) 的 WebAssembly 构建） | GNU LGPL v3，未修改 | `src/platform/thumbs/electron-sandbox/vendor/libheif` |
| [face-api](https://github.com/vladmandic/face-api) 及 TensorFlow.js 和其人脸模型 | MIT | `src/platform/faces/electron-sandbox/vendor/face-api` |
| [COCO-SSD 和 MobileNet](https://github.com/tensorflow/tfjs-models) 模型 | Apache 2.0 | `src/platform/faces/electron-sandbox/vendor/pets` |
| [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) 1.22 and the [TinyCLIP ViT-61M/32](https://huggingface.co/wkcn/TinyCLIP-ViT-61M-32-Text-29M-LAION400M) model (Microsoft; built by `tools/models/build.py`) | MIT · MIT | `src/platform/faces/electron-sandbox/vendor/onnxruntime-web` · `models/tinyclip` |
| [Natural Earth](https://www.naturalearthdata.com) 国界与国名（1:50m） | 公有领域 | `src/platform/geo` |
| [GeoNames](https://www.geonames.org) — cities15000 | CC BY 4.0 | `src/platform/geo/node/cities.json` |
| [LibRaw](https://www.libraw.org) 0.22 (raw development), in WebAssembly via [libraw-wasm](https://github.com/colorhythm/libraw-wasm) and [typed-cstruct](https://github.com/ssssota/typed-cstruct) | LGPL-2.1 or CDDL-1.0 · MIT · MIT | `src/platform/raw/electron-sandbox/vendor` |
| [Lensfun](https://lensfun.github.io) lens database (lens correction profiles), converted by `tools/lensfun/build.py` | CC BY-SA 3.0 (data only; none of Lensfun’s code) | `src/workbench/services/adjust/common/lensfun.json` |
| [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans)、[JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) | SIL Open Font License 1.1 | 字体 |

## 截图中的照片

截图中的照片来自 [WordPress Photo Directory](https://wordpress.org/photos/)，属于公共领域（[CC0](https://creativecommons.org/publicdomain/zero/1.0/)）：无需署名，在此致谢列出。描述、相机和日期均来自摄影师本人；地图上的地点是为演示而添加的。

- **罗马:** [Isabel Gutierrez](https://wordpress.org/photos/photo/53469e1c45/), [salsel](https://wordpress.org/photos/photo/2456557419/), [Jupa](https://wordpress.org/photos/photo/3816aaf093/), Bigul Malayi ([1](https://wordpress.org/photos/photo/17168efb07/), [2](https://wordpress.org/photos/photo/616857a90c/), [3](https://wordpress.org/photos/photo/33768dc862/), [4](https://wordpress.org/photos/photo/42268dc85f/)), [karolishostinger](https://wordpress.org/photos/photo/35766e9c63/)
- **里斯本:** [Isabel Gutierrez](https://wordpress.org/photos/photo/35669e1d6f/), [MelissaH](https://wordpress.org/photos/photo/31968ae275/), KafleG ([1](https://wordpress.org/photos/photo/687685d279/), [2](https://wordpress.org/photos/photo/852685d283/), [3](https://wordpress.org/photos/photo/468685d28f/), [4](https://wordpress.org/photos/photo/667685d2c4/), [5](https://wordpress.org/photos/photo/501685d2ca/)), [Jeff Golenski](https://wordpress.org/photos/photo/3016a7fb59/)
- **哥斯达黎加:** [Harlyn Luna Brenes](https://wordpress.org/photos/photo/626af3dce8/), [Francisco Herrera](https://wordpress.org/photos/photo/18764e77d3/), wenmirandav ([1](https://wordpress.org/photos/photo/2786aefef5/), [2](https://wordpress.org/photos/photo/2776aefeba/), [3](https://wordpress.org/photos/photo/2016aeffe6/)), [alexandrachacaltana2303](https://wordpress.org/photos/photo/3846aeeac8/), [dmoreno2003](https://wordpress.org/photos/photo/4466af376b/), [dangrijal](https://wordpress.org/photos/photo/3516af7648/), [xbullscm](https://wordpress.org/photos/photo/7066af7fae/)
- **加尔达湖:** xbullscm ([1](https://wordpress.org/photos/photo/836af4b8d6/), [2](https://wordpress.org/photos/photo/716af4b7c7/), [3](https://wordpress.org/photos/photo/1046af4b83/), [4](https://wordpress.org/photos/photo/8286af4b88/), [5](https://wordpress.org/photos/photo/3966af4b78/))
- **建筑:** Joel Peralta ([1](https://wordpress.org/photos/photo/9656a6d336/), [2](https://wordpress.org/photos/photo/1866a70aeb/), [3](https://wordpress.org/photos/photo/8766a7044c/), [4](https://wordpress.org/photos/photo/9866a6d32f/), [5](https://wordpress.org/photos/photo/766a2f39b8/)), [Silvia Fernanda Marin Giraldo](https://wordpress.org/photos/photo/1656a972f2/), [dumanag](https://wordpress.org/photos/photo/7806a66cad/), [Manjil Aryal](https://wordpress.org/photos/photo/416a282c7f/), [Anup Kankale](https://wordpress.org/photos/photo/966a390efb/)
- **夜空:** [shirishpoudel07](https://wordpress.org/photos/photo/8606a28c17/), Jeff Golenski ([1](https://wordpress.org/photos/photo/544620fdb6/), [2](https://wordpress.org/photos/photo/92361d465c/)), [vanessartavia](https://wordpress.org/photos/photo/3036ae9774/), [Natcha Boonroj](https://wordpress.org/photos/photo/512693d15a/), [Faisal Ahammad](https://wordpress.org/photos/photo/816ae8da24/)
- **京都:** [Maruti Mohanty](https://wordpress.org/photos/photo/4746570441/), [Timi Wahalahti](https://wordpress.org/photos/photo/14766bbb55/), Wajari Velasquez ([1](https://wordpress.org/photos/photo/506a214832/), [2](https://wordpress.org/photos/photo/5236a216f0/), [3](https://wordpress.org/photos/photo/8366a216e4/), [4](https://wordpress.org/photos/photo/8976a21449/), [5](https://wordpress.org/photos/photo/296a2182a4/))
