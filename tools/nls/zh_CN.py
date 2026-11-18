# 简体中文. Build with: python3 tools/nls/build.py  (no plural forms: one string each)
MESSAGES = {
 'app': {'name': 'LionPhotos', 'tagline': '照片和视频收藏'},
 'workbench': {'preloadMissing': '安全桥接（preload）未能加载。请重新启动 LionPhotos。'},
 'boot': {'starting': '正在启动…', 'reading': '正在打开 {folder}…'},
 'views': {'trash': '回收站记录', 'tools': '工具', 'photos': '照片', 'limbo': '待删区', 'overview': '概览', 'duplicates': '重复文件', 'organize': '整理', 'backup': '备份',
   'project': '项目', 'person': '人物', 'pet': '宠物', 'place': '地点', 'album': '相册'},
 'labels': {'editTitle': '编辑名称和描述', 'descriptionPlaceholder': '内容是什么、为谁、何时……（可选）', 'removeFrom': '从“{name}”中移除', 'removeFromTitle': '取消所选项目与“{name}”的关联；其中识别出的面孔不再指向它（文件不会被更改）', 
   'eyebrow': '标签', 'button': '标签…', 'forFolder': '此文件夹的类别、项目、人物、宠物、地点和相册',
   'forFiles': '{count} 个项目的标签',
   'folderHint': '应用于此文件夹中的所有内容，包括子文件夹。只更改 LionPhotos 的目录，不会修改任何文件。',
   'filesHint': '应用于所选文件。文件自身的类别和项目优先于文件夹的；人物、宠物和地点会叠加。',
   'back': '返回{view}', 'backTitle': '返回{view}（{key}）',
   'none': '（无）', 'save': '保存', 'edit': '编辑', 'add': '添加', 'open': '在照片中查看', 'rename': '重命名', 'delete': '删除',
   'inherited': '来自文件夹：{names}', 'fromFolder': '来自文件夹', 'noneYet': '还没有项目、人物、宠物或地点。',
   'noPhotosGroup': '还没有照片',
   'noItems': '此收藏中没有项目', 'howTo': '在上方创建一个，然后在侧边栏的文件夹或所选照片上使用“标签…”。',
   'deleteTitle': '删除“{name}”？', 'deleteMessage': '将从 {count} 个项目中移除。文件不会被修改。',
   'deleteMessageEmpty': '没有项目使用它。文件不会被修改。', 'deleteNote': '只有标签离开 LionPhotos 的目录；你的照片和视频保持原样。',
   'type': {
     'project': {'one': '项目', 'plural': '项目', 'new': '新建项目', 'name': '项目名称', 'add': '+ 项目', 'empty': '还没有项目',
                 'lead': '一项工作、一项研究或一份委托。'},
     'person': {'one': '人物', 'plural': '人物', 'new': '新建人物', 'name': '人物名称', 'add': '+ 人物', 'empty': '还没有人物',
                'lead': '照片中出现的人。一张照片可以有多个人物。'},
     'pet': {'one': '宠物', 'plural': '宠物', 'new': '新建宠物', 'name': '宠物名称', 'add': '+ 宠物', 'empty': '还没有宠物',
             'lead': '照片中出现的动物。'},
     'place': {'one': '地点', 'plural': '地点', 'new': '新建地点', 'name': '地点名称', 'add': '+ 地点', 'empty': '还没有地点',
               'lead': '照片拍摄的地方：一座城市、一栋建筑、一次现场考察。'},
     'sphere': {'one': '类别', 'plural': '个人或工作', 'new': '', 'name': '', 'add': '', 'empty': '', 'lead': ''},
     'album': {'one': '相册', 'plural': '相册', 'new': '新建相册', 'name': '相册名称', 'add': '+ 相册', 'empty': '还没有相册',
               'lead': '手工整理的相册。'}}},
 'albums': {'removeMany': '从相册移除 {count} 项', 'otherSphere': '与相册类别不同：{category}', 'showWhich': '显示哪些相册', 'showAll': '全部', 'showPersonal': '个人', 'showProfessional': '工作', 'noPersonal': '还没有包含个人照片的相册。', 'noProfessional': '还没有包含工作照片的相册。', 
   'newEllipsis': '新建相册…', 'moreAlbums': '全部相册（{count}）…',
   'eyebrow': '相册', 'one': '相册', 'lead': '挑选一次旅行、一场聚会或一项工作中最好的照片放在一起，配上封面和说明，随时可以放映。一张照片可以在多个相册中；文件留在原处，不会复制任何内容。',
   'new': '新建相册', 'create': '创建相册', 'name': '名称', 'namePlaceholder': '相册名称', 'nameMissing': '请为新相册命名。',
   'description': '说明', 'descriptionPlaceholder': '这些照片的内容（可选）',
   'empty': '还没有相册', 'howTo': '在上方创建一个，或在照片中选择照片后使用“添加到相册…”。', 'noPhotos': '还没有照片',
   'open': '打开相册', 'edit': '编辑相册', 'delete': '删除相册', 'openAlbum': '打开相册',
   'add': '添加到相册…', 'addTitleHint': '将所选照片放入相册（新建或已有）。不会复制任何文件。', 'addKey': '添加到相册（{key}）',
   'addTitle': '将 {count} 个项目添加到相册', 'addConfirm': '添加',
   'addNote': '只更改 LionPhotos 的目录：照片留在原文件夹中，同一张照片可以在多个相册中。',
   'added': '已将 {count} 个项目添加到“{name}”。',
   'remove': '从相册移除', 'removeTitle': '从“{name}”中移除所选项目（文件不会被修改）',
   'removed': '已从“{name}”移除 {count} 个项目。',
   'viaFolder': '{count} 个项目因整个文件夹在“{name}”中而在其中：请在侧边栏的该文件夹上用“标签…”移除文件夹。',
   'setCover': '设为封面', 'isCover': '相册封面', 'coverTitle': '在相册封面上显示这张照片',
   'deleteMessage': '将删除包含 {count} 个项目的相册。照片不会被修改。',
   'deleteMessageEmpty': '相册中没有照片。其他内容不会改变。', 'deleteNote': '只有相册离开 LionPhotos 的目录；你的照片和视频保持原样。'},
 'slideshow': {'button': '幻灯片', 'start': '开始幻灯片（{key}）', 'startTitle': '全屏逐张显示照片（在查看器中按 P）',
   'pause': '暂停（{key}）', 'space': '空格', 'interval': '每张时间', 'seconds': '{n} 秒', 'fullscreen': '全屏（{key}）'},
 'settings': {'title': '设置', 'tileDetails': '在缩略图上显示格式和类别', 'tileDetailsHint': '关闭：照片上只显示 RAW 和视频时长。', 'focus': '专注模式', 'focusHint': '只显示照片：没有侧边栏、信息面板和顶栏。再按同一个键或 Esc 恢复。'},
 'units': {'B': 'B', 'KB': 'KB', 'MB': 'MB', 'GB': 'GB', 'TB': 'TB', 'PB': 'PB', 'bytes': '字节'},
 'nls': {'auto': '自动', 'language': '语言', 'changeHint': '窗口将以新语言重新加载'},
 'common': {
   'cancel': '取消', 'close': '关闭', 'confirm': '确认', 'explorer': '文件资源管理器', 'fileManager': '文件管理器',
   'showIn': '在{explorer}中显示', 'rootFolder': '（收藏文件夹）', 'pathCopied': '路径已复制。', 'video': '视频',
   'items': '{count} 个项目', 'files': '{count} 个文件',
   'photos': '{count} 张照片', 'videos': '{count} 个视频',
   'photosLabel': '照片', 'videosLabel': '视频'},
 'marks': {
   'label': '标记', 'great': '很好', 'ok': '可以', 'reject': '移入待删区', 'none': '无标记', 'all': '所有标记',
   'greatTitle': '很好：一颗星（{key}）', 'okTitle': '可以（{key}）', 'rejectTitle': '移入待删区（{key}）', 'clearTitle': '清除标记（{key}）',
   'rejectBadge': '待删', 'option': '{name}（{count}）',
   'trashRejects': '删除待删区中的 {count} 个文件',
   'trashRejectsTitle': '将此文件夹中所有待删除的文件（{size}）移到回收站，需输入确认码',
   'hint': '按 1 · 2 · 3 标记所选项，0 清除。只更改 LionPhotos 的目录。'},
 'titlebar': {'openFolder': '打开照片文件夹（{key}）', 'placeholder': '打开一个照片和视频文件夹'},
 'activitybar': {'ariaLabel': '视图', 'toggleSidebar': '显示或隐藏侧边栏（{key}）'},
 'editor': {'breadcrumbsLabel': '文件夹'},
 'selection': {'period': '时间', 'formats': '格式', 'folders': '文件夹', 'noMarks': '无', 'add': '添加…',
   'some': '{n}/{total}', 'allTitle': '所有所选项目', 'remove': '移除',
   'removeTitle': '从 {n} 个所选项目中移除“{name}”（文件不会被修改）',
   'fromFolder': '来自其文件夹：请在文件夹上用“标签…”更改',
   'noAlbums': '还不在任何相册中。', 'noPeople': '还没有标记任何人。',
   'noLabels': '没有项目。', 'noPets': '还没有宠物。',
   'noPlaces': '还没有地点。'},
 'sphere': {'scope': {'all': '来自全部照片', 'personal': '来自个人照片', 'professional': '来自工作照片', 'none': '来自未分类照片'}, 'scopeTitle': '本页所依据的照片：在标题栏中选择', 'personal': '个人', 'professional': '工作', 'none': '未分类',
   'pickTitle': '显示个人、工作、尚未分类或全部照片',
   'option': {'all': '所有照片', 'personal': '个人照片', 'professional': '工作照片', 'none': '未分类'},
   'optionCount': '{name}（{count}）', 'label': '类别', 'set': '标记为{name}', 'clear': '移除“{name}”',
   'summary': '{personal} 个人 · {professional} 工作 · {none} 未分类',
   'clearAll': '移除类别（文件自身的；文件夹的保留）', 'fromFolder': '{count} 个从文件夹获得类别'},
 'faces': {
   'auto': '自动查找人脸', 'autoOn': '开启：每次刷新时分析新照片。', 'autoOff': '关闭：只有选择“立即索引”时才查找人脸。',
   'autoHint': '开启：LionPhotos 每次刷新时在后台查找新照片和已修改照片中的人脸。',
   'indexNow': '立即索引', 'indexNowCount': '立即索引（{count} 张新照片）', 'indexNowTitle': '在此收藏尚未分析的照片中查找人脸',
   'stopRun': '停止', 'last': '上次索引：{when}', 'never': '从未索引', 'lastTitle': '此收藏的照片上次被分析的时间',
   'unsupported': '这台电脑不支持人脸识别。',
   'unsupportedGpu': '需要图形加速（支持 WebGL 的显卡）；仅靠处理器，每张照片需要很多秒。',
   'unsupportedMemory': '至少需要 4 GB 内存（这台电脑有 {detail}）。',
   'gpuBoost': '使用独立显卡', 'gpuBoostTitle': '重新启动 LionPhotos，请求高性能显卡并忽略 Chromium 的屏蔽列表。可以撤消。', 'gpuBoostOff': '恢复默认显卡', 'gpuBoostOffTitle': '重新启动 LionPhotos，不再请求独立显卡',
   'tryAnyway': '仍然尝试', 'tryAnywayTitle': '真正启动识别：如果能使用显卡，就保持开启', 'technical': '技术详情：{detail}',
   'eyebrow': '人脸识别',
   'offTitle': '识别此收藏中的人脸',
   'offLead': 'LionPhotos 会找到照片中的人脸，并把相似的放在一起。你命名一次，这个人就会在其他照片中被标记——作为建议，由你确认或更正。',
   'private': '一切都在这台电脑上完成：不会发送任何照片或人脸。只更改 LionPhotos 的目录；你的文件保持原样。',
   'start': '在 {count} 张照片中查找人脸',
   'working': '正在查找人脸…', 'paused': '人脸识别已暂停', 'ready': '人脸识别已开启',
   'progress': '{done}/{total} 张照片 · 找到 {faces} 张人脸', 'summary': '已分析 {photos} 张照片 · {faces} 张人脸。每次刷新时分析新照片。',
   'error': '识别已停止：{error}', 'pause': '暂停', 'resume': '继续', 'stop': '关闭',
   'stopTitle': '关闭此收藏的人脸识别（已找到的人脸和人物保留）',
   'stopConfirm': '关闭人脸识别？', 'stopMessage': '不会再分析新照片。已找到的人脸、名字和每张照片中的人物都会保留。',
   'peopleLead': '照片中出现的人。一张照片可以有多个人物。开启人脸识别后，LionPhotos 会按人脸标记他们。',
   'toCheck': '有 {count} 张 LionPhotos 建议的人脸待确认：打开每个人物。',
   'howToNamed': '在下方为一组人脸命名，或在上方创建人物。',
   'review': '检查此人的人脸', 'reviewBar': '检查面孔', 'reviewShort': '人脸', 'pendingTitle': '{count} 条建议待确认',
   'whoTitle': '这是谁？', 'groupsCount': '{count} 组',
   'whoLead': '还没有名字的相似人脸。输入一个名字（新人物或已有人物）并按 Enter：组内所有人脸都会得到这个名字，LionPhotos 会在其他照片中建议此人。× 可将一张人脸移出该组。',
   'groupsWaiting': '随着照片被分析，分组会出现在这里。', 'groupsNone': '找到的所有人脸都已命名，或已忽略。',
   'moreGroups': '再显示 {count} 组',
   'namePlaceholder': '这是谁？', 'save': '保存', 'named': '{count} 张人脸已命名为“{name}”。',
   'notInGroup': '不是此人：移出该组（忽略）', 'groupMeta': '{count} 张人脸 · {photos} 张照片',
   'ignoreGroup': '忽略', 'ignoreGroupTitle': '陌生人、背景中的人脸：离开分组且永不建议',
   'ignoredLink': '{count} 张已忽略的人脸', 'ignoredTitle': '已忽略的人脸',
   'ignoredLead': '不会被标记或建议的人脸。需要时可放回分组。', 'ignoredNone': '没有已忽略的人脸。', 'unignore': '放回分组',
   'facesCount': '{count} 张人脸',
   'suggestedTitle': '{count} 条建议待确认',
   'suggestedLead': 'LionPhotos 认为与 {name} 相似的人脸。这些照片已带有 {name}；✓ 确认，× 表示不是（不再建议）。',
   'confirmAll': '全部确认（{count}）', 'confirmedTitle': '{count} 张已确认的人脸',
   'noConfirmed': '还没有已确认的人脸。', 'confirm': '确认：就是此人', 'notThem': '不是 {name}', 'someoneElse': '是另一个人…',
   'deleteNote': '只有人物离开 LionPhotos 的目录；其人脸重新变为未知。你的照片保持原样。'},
 'pets': {
   'eyebrow': '宠物识别', 'auto': '自动查找宠物', 'autoOn': '开启：每次刷新时分析新照片。', 'autoOff': '关闭：只有选择“立即索引”时才查找宠物。',
   'autoHint': '开启：LionPhotos 每次刷新时在后台查找新照片和已修改照片中的宠物。',
   'indexNow': '立即索引', 'indexNowCount': '立即索引（{count} 张新照片）', 'indexNowTitle': '在此收藏尚未分析的照片中查找宠物',
   'stopRun': '停止', 'last': '上次索引：{when}', 'never': '从未索引', 'lastTitle': '此收藏的照片上次被分析宠物的时间',
   'unsupported': '这台电脑不支持宠物识别。',
   'private': '一切都在这台电脑上完成：不会发送任何照片。只更改 LionPhotos 的目录；你的文件保持原样。',
   'working': '正在查找宠物…', 'paused': '宠物识别已暂停',
   'progress': '{done}/{total} 张照片 · 找到 {faces} 只动物', 'summary': '已分析 {photos} 张照片 · {faces} 只动物。可找到狗、猫、鸟、马、羊和牛。',
   'error': '识别已停止：{error}', 'pause': '暂停', 'resume': '继续',
   'peopleLead': '照片中出现的动物。LionPhotos 会找到狗、猫、鸟、马、羊和牛，并把相似的放在一起；同一品种的两只动物可能很像，请检查建议。',
   'toCheck': '有 {count} 只 LionPhotos 建议的动物待确认：打开每只宠物。',
   'howToNamed': '在下方为一组动物命名，或在上方创建宠物。',
   'review': '检查这只宠物的照片', 'reviewBar': '检查识别结果', 'reviewShort': '照片', 'pendingTitle': '{count} 条建议待确认',
   'whoTitle': '这是哪只宠物？', 'groupsCount': '{count} 组',
   'whoLead': '还没有名字的相似动物。输入一个名字（新宠物或已有宠物）并按 Enter：组内所有动物都会得到这个名字，LionPhotos 会在其他照片中建议这只宠物。× 可将一只移出该组。',
   'groupsWaiting': '随着照片被分析，分组会出现在这里。', 'groupsNone': '找到的所有动物都已命名，或已忽略。',
   'moreGroups': '再显示 {count} 组',
   'namePlaceholder': '哪只宠物？', 'save': '保存', 'named': '{count} 只动物已命名为“{name}”。',
   'notInGroup': '不是这只宠物：移出该组（忽略）', 'groupMeta': '{count} 张图像 · {photos} 张照片',
   'ignoreGroup': '忽略', 'ignoreGroupTitle': '不是你的动物：离开分组且永不建议',
   'ignoredLink': '{count} 只已忽略的动物', 'ignoredTitle': '已忽略的动物',
   'ignoredLead': '不会被标记或建议的动物。需要时可放回分组。', 'ignoredNone': '没有已忽略的动物。', 'unignore': '放回分组',
   'facesCount': '{count} 张图像',
   'suggestedTitle': '{count} 条建议待确认',
   'suggestedLead': 'LionPhotos 认为与 {name} 相似的动物。这些照片已带有 {name}；✓ 确认，× 表示不是（不再建议）。',
   'confirmAll': '全部确认（{count}）', 'confirmedTitle': '{count} 张已确认的图像',
   'noConfirmed': '还没有已确认的图像。', 'confirm': '确认：就是这只宠物', 'notThem': '不是 {name}', 'someoneElse': '是另一只宠物…',
   'deleteNote': '只有宠物离开 LionPhotos 的目录；其图像重新变为未知。你的照片保持原样。'},
 'species': {'dog': '狗', 'cat': '猫', 'bird': '鸟', 'horse': '马', 'sheep': '羊', 'cow': '牛'},
 'home': {'button': '开始', 'title': '开始：收藏中的所有照片和视频，不加筛选（{key}）',
   'allYears': '查看所有年份', 'allYearsTitle': '重新显示所有年份的照片', 'year': '年份'},
 'panels': {'folders': '文件夹', 'albums': '相册', 'labels': '标签', 'dates': '日期', 'title': '侧边栏中的{name}（再次点击隐藏）',
   'allAlbums': '所有相册', 'manage': '管理{name}', 'allDates': '所有日期', 'datesHint': '选择一个年份后，照片中只显示该年的照片（按拍摄日期，或文件日期）。'},
 'sidebar': {
   'title': '资料库', 'folder': '收藏', 'folders': '文件夹', 'resize': '拖动以调整大小',
   'depthLabel': '子文件夹层级', 'depthDecrease': '减少层级', 'depthIncrease': '增加层级', 'unlimited': '所有层级',
   'hint': {'unlimited': '读取所有子文件夹。', 'none': '只读取文件夹本身，不含子文件夹。', 'depth': '读取 {count} 层子文件夹。'},
   'refresh': '刷新', 'refreshFolder': '刷新此文件夹',
   'refreshTitle': '在“{folder}”及其子文件夹中查找新文件和已修改的文件（{key}）。未更改的文件保留其缩略图。',
   'scope': '只读取“{folder}”及其子文件夹，不读取磁盘上的其他内容。',
   'changeFolder': '更换…', 'changeFolderTitle': '打开另一个文件夹（{key}）', 'openFolder': '打开文件夹…', 'stop': '停止（{key}）',
   'scanCount': '找到 {count} 个文件 · {changed} 个新增或已修改',
   'emptyTree': '打开一个文件夹，在这里查看其子文件夹。', 'moreFolders': '… 还有 {count} 个文件夹'},
 'statusbar': {
   'ready': '就绪', 'scanning': '正在读取文件夹：{count} 个文件',
   'thumbs': '缩略图 {done} / {total}', 'thumbsTitle': '正在后台创建缩略图；先处理屏幕上的',
   'previews': '预览 {done} / {total}', 'stopPreviews': '停止',
   'selected': '已选 {count} 个 · {size}',
   'revealTitle': '显示所选项目（每次点击转到下一个）',
   'theme': '主题', 'themeAuto': '自动', 'themeLight': '浅色', 'themeDark': '深色', 'themeTeal': '蓝色',
   'themeAutoTitle': '跟随系统主题', 'themeLightTitle': '浅色主题', 'themeDarkTitle': '深色主题', 'themeTealTitle': '蓝色主题：标志的蓝色'},
 'welcome': {
   'logoAlt': '{app} 标志', 'lead': '打开一个文件夹，以缩略图查看其中的照片和视频，按名称、相机、作者或编解码器搜索，并整理到文件夹中。',
   'openFolder': '打开文件夹', 'collections': '之前打开的收藏',
   'shortcuts': {'openFolder': '打开文件夹', 'refresh': '查找新文件和已修改的文件', 'search': '搜索'},
   'note': '缩略图只创建一次并保存在本地的小缓存中；只有文件改变时才会重新创建。任何内容都不会离开你的电脑。'},
 'broad': {'eyebrow': '一个非常大的文件夹', 'diskTitle': '读取整个磁盘？', 'homeTitle': '读取整个用户文件夹？',
   'message': 'LionPhotos 只读取你选择的文件夹及其子文件夹。“{folder}”包含其中的一切，因此会读取所有文件夹。',
   'note': '通常最好选择存放照片的文件夹（例如“图片”或某个项目文件夹）。',
   'confirm': '仍然读取'},
 'photos': {'noAlbum': '仅显示不在相册中的照片', 'noAlbumTitle': '只显示尚未加入任何相册的照片和视频', 'noAlbumClear': '也显示相册中的照片', 
   'modeLabel': '显示方式', 'modeGrid': '网格', 'modeList': '列表',
   'gridLabel': '照片和视频', 'search': '搜索', 'searchPlaceholder': '搜索名称、文件夹、相机、作者、编解码器…',
   'kind': {'all': '全部', 'images': '照片', 'videos': '视频'}, 'year': '年份', 'allYears': '所有年份',
   'sort': {'': '排序', 'newest': '最新优先', 'oldest': '最早优先', 'name': '名称', 'size': '最大优先'},
   'filters': '筛选', 'filtersTitle': '类型、年份、标记和子文件夹', 'more': '更多', 'moreTitle': '所选项目的更多操作：打开、重命名、移动、整理、回收站…', 'thisFolderOnly': '仅此文件夹',
   'subfolders': '子文件夹', 'subfoldersHint': '同时显示当前文件夹的子文件夹中的项目',
   'zoom': '缩略图大小', 'toggleInfo': '信息面板（{key}）', 'selectGroup': '全选', 'select': '选择',
   'selected': '已选 {count} 个', 'open': '打开', 'moveTo': '移动到文件夹…', 'organize': '按日期整理',
   'trash': '移到回收站', 'clearSelection': '取消选择', 'clearFilters': '清除筛选',
   'empty': {'title': '这里没有照片或视频', 'hint': '此文件夹中没有照片或视频。在树中选择另一个文件夹，或打开“子文件夹”。',
             'scanning': '正在读取文件夹…', 'filtered': '没有符合筛选条件的内容', 'filteredHint': '试试其他关键词、年份或类型。'}},
 'list': {'name': '名称', 'folder': '文件夹', 'type': '类型', 'dimensions': '尺寸', 'size': '大小', 'date': '日期', 'details': '相机 · 作者 · 编解码器'},
 'category': {'original': '原片', 'edited': '已编辑', 'raw': 'RAW', 'video': '视频', 'graphic': '其他图像',
   'hint': {'original': '未编辑的相机照片（JPEG、HEIC、TIFF）', 'edited': '已编辑的副本：名称中带 -Edit、-2…，或由 Lightroom、Photoshop 等编辑器保存',
            'raw': '相机 RAW 文件（CR2、NEF、ARW、DNG…）', 'video': '视频', 'graphic': 'PNG、GIF、WebP 等图像：截图、扫描件、插图'}},
 'info': {'organize': '整理', 'addTo': '添加到', 'notOrganized': '尚未加入任何相册、人物、地点或项目', 'selectionFiles': '文件', 'folders': '{count} 个文件夹', 'next': '下一张', 'nextTitle': '下一张照片，面板保持不变（Alt+↓；Alt+↑ 返回）', 'inThis': '包含', 'details': '详细信息', 'fileDetails': '文件和相机',
   'empty': '选择一张照片或一个视频以查看详细信息。', 'selection': '所选项', 'reveal': '显示', 'openDefault': '用默认应用打开', 'copyPath': '复制路径',
   'file': '文件', 'format': '格式', 'size': '大小', 'taken': '拍摄日期', 'modified': '修改日期', 'folder': '文件夹',
   'image': '图像', 'dimensions': '尺寸', 'encoding': '编码', 'compression': {'baseline': 'JPEG 基线', 'progressive': 'JPEG 渐进式'},
   'orientation': '方向', 'orientationRotated': '由相机旋转',
   'video': '视频', 'container': '容器', 'videoCodec': '视频编解码器', 'resolution': '分辨率', 'fps': '帧率', 'duration': '时长',
   'bitrate': '比特率', 'audioCodec': '音频', 'noAudio': '无音频', 'rotation': '旋转', 'mono': '单声道', 'stereo': '立体声',
   'camera': '相机', 'device': '设备', 'lens': '镜头', 'exposure': '曝光', 'aperture': '光圈', 'iso': 'ISO', 'focal': '焦距',
   'flash': '闪光灯', 'flashOn': '已闪光', 'flashOff': '未闪光', 'location': '位置（GPS）',
   'authorship': '作者信息', 'author': '作者', 'copyright': '版权', 'title': '标题', 'description': '描述', 'software': '软件',
   'integrity': '内容'},
 'viewer': {'opening': '正在以实际大小打开…', 'edit': '编辑', 'editTitle': '显示或收起编辑面板：类别、相册、调整、描述、作者和地点（I）', 'outOfFilter': '这张照片现在属于“{category}”。查看器打开期间它会留在这里；关闭后，可在标题栏的类别筛选“{category}”中找到它。', 'zoomLevel': '缩放', 'zoomIn': '放大（+）', 'zoomOut': '缩小（−）', 'zoomToggle': '适应屏幕 ↔ 实际大小（Z）· 滚轮在指针处缩放，拖动可移动', 'label': '查看器', 'previous': '上一张（←）', 'next': '下一张（→）', 'zoom': '实际大小',
   'imageUnsupported': '这里无法以完整尺寸显示 {format} 文件；这是它的缩略图。',
   'videoUnsupported': '这里无法播放此视频（{format}）。',
   'rawFull': '相机 JPEG，完整尺寸 · {size}', 'rawPreview': '相机 JPEG · {size}（此文件中保存的最大的一张）',
   'rawNoteTitle': '每个 RAW 文件都带有一张相机按自身设置生成的 JPEG。这就是那张图像——与 Lightroom 和系统查看器在照片冲印前显示的相同。'},
 'previews': {
   'generate': '创建预览', 'one': '为此视频创建 5 秒预览', 'folderTitle': '为此文件夹中的视频创建 5 秒预览',
   'eyebrow': '视频预览', 'nothingToDo': '这些视频已经有预览。',
   'scope': {'one': '此视频', 'folder': '此文件夹中的视频', 'all': '所有已索引的视频', 'selected': '所选的 {count} 个视频'},
   'confirm': {'title': '为 {count} 个视频创建预览？',
     'message': '将为{scope}创建一段前 5 秒、缩略图大小的短片。鼠标悬停在视频上时播放。',
     'videos': '视频', 'time': '预计时间', 'about': '约 {time}',
     'note': '这需要处理时间。它在后台运行，一次一个视频，并在缩略图之后进行——你可以继续使用 LionPhotos，并可在状态栏中停止。',
     'start': '在后台创建'},
   'started': '已将 {count} 个视频加入预览队列。'},
 'overview': {
   'eyebrow': '收藏', 'title': '概览', 'collection': '照片和视频', 'itemsUnit': '个项目',
   'size': '大小', 'period': '时间', 'previews': '视频预览',
   'kinds': '按类型统计文件', 'kindsHint': '花瓣越大 = 文件越多。点击查看。', 'total': '总计',
   'legend': {'kind': '类型', 'files': '文件', 'size': '大小'},
   'previewsHint': '在后台为所有已索引的视频创建 5 秒预览。', 'noVideos': '此收藏中没有视频。',
   'byYear': '按年份', 'byYearHint': '点击年份查看', 'formats': '格式', 'cameras': '相机和手机', 'camerasHint': '来自文件的元数据',
   'codecs': '视频编解码器', 'authors': '作者', 'noMeta': '随着缩略图的创建而显示。',
   'cache': '缩略图缓存', 'cacheHint': '只创建一次；文件改变时才重新创建',
   'cacheThumbs': '缩略图', 'cachePreviews': '视频预览', 'cacheAverage': '平均缩略图', 'cacheFile': '缓存文件', 'clearCache': '清除缓存…'},
 'dupes': {
   'eyebrow': '相同内容（SHA-256）', 'title': '重复文件',
   'lead': '按内容而不是名称查找完全相同的副本：先比较大小，再比较每个文件的开头和结尾，只有必要时才读取整个文件。选择要保留的副本；其余的移到回收站。',
   'find': '查找重复文件', 'again': '再次查找', 'starting': '正在启动…',
   'stage': {'partial': '正在比较开头和结尾 · {done} / {total}', 'full': '正在确认内容相同 · {pct}%'},
   'wasted': '多余副本占用的空间', 'notRun': '尚未检查', 'groups': '{count} 组相同的文件',
   'none': '没有重复文件', 'noneHint': '此收藏中的所有照片和视频都是唯一的。',
   'copies': '{count} 个副本', 'each': '每个', 'keep': '保留', 'toTrash': '回收站',
   'trashCopies': '将 {count} 个副本移到回收站',
   'trashAll': '将 {count} 个多余副本移到回收站…',
   'more': '显示更多（还剩 {count} 个）'},
 'organize': {'theme': '主题', 'themePlaceholder': '例如：毕业典礼', 'split': '分开 Raw/ 和 Img/', 'splitHint': '在每个文件夹中：相机 RAW 文件（及其 .xmp）放入 Raw/，JPG、PNG、HEIC… 放入 Img/；视频留在文件夹中。', 'byAlbum': '按相册建文件夹', 'byAlbumHint': '每个相册放入“年/年-月-日-相册”，日期取第一张照片。同时在两个相册中的照片跟随较早开始的相册；每个相册通过新文件夹保留其照片。', 'noAlbums': '还没有包含照片的相册。', 'runAlbums': '整理 {count} 个相册（{photos}）', 'photos': '{count} 张照片', 
   'eyebrow': '整理', 'title': '整理收藏', 'lead': '每项更改都会先显示计划，并要求你输入一个代码。更改可在下方撤消。',
   'byDate': '按日期分文件夹', 'byDateHint': '使用拍摄日期（EXIF），没有时使用文件日期。',
   'pattern': {'yearSlashMonth': '2024 / 2024-07', 'yearMonth': '2024-07', 'year': '2024', 'yearSlashDay': '2024 / 2024-07-14', 'dayTheme': '2024-07-14-主题'},
   'scope': {'selected': '已选 {count} 个项目', 'view': '照片中显示的 {count} 个项目'},
   'run': '整理 {count} 个项目…', 'moreFolders': '… 还有 {count} 个文件夹',
   'moveTitle': '移动到文件夹', 'moveLead': '将项目移动到你选择的文件夹，并按类型分到子文件夹。同一张照片的文件（RAW、Lightroom 附属文件、已编辑和原始 JPEG）会一起移动。',
   'moveRun': '移动到文件夹…', 'history': '最近的操作', 'noHistory': '还没有操作。', 'undone': '已撤消',
   'trashNote': '从回收站还原'},
 'move': {
   'eyebrow': '移动到文件夹', 'title': '移动 {count} 个项目', 'destination': '目标',
   'newFolder': '此收藏中的新文件夹', 'newFolderDefault': '选择 {date}', 'otherFolder': '其他文件夹', 'choose': '选择…', 'noneChosen': '未选择文件夹',
   'split': '按类型分到子文件夹',
   'sub': {'raw': 'RAW', 'original': 'JPG', 'edited': '已编辑', 'video': '视频'},
   'subLabel': {'raw': 'RAW 文件', 'original': '原始照片', 'edited': '已编辑照片', 'video': '视频'},
   'subHint': {'raw': 'CR2、NEF、ARW、DNG… 及其 .xmp', 'original': '相机 JPEG，未编辑', 'edited': '-Edit、-2、Lightroom、Photoshop…', 'video': 'MP4、MOV…'},
   'related': '一并移动相关文件', 'relatedHint': '同一文件夹中同一张照片的文件：RAW、Lightroom 的 .xmp，以及同名的已编辑和原始 JPEG。',
   'continue': '继续…'},
 'backup': {
   'eyebrow': '按文件夹备份', 'title': '备份',
   'lead': '在任意磁盘上选择一个主文件夹和一个备份文件夹。它们会连同子文件夹按内容比较——无论名称和位置如何——你会看到两边都有的、备份中缺少的，以及只在备份中的。',
   'master': '主文件夹', 'backup': '备份文件夹', 'noFolder': '没有文件夹', 'pickHint': '选择一个文件夹…',
   'choose': '选择…', 'change': '更换…', 'useCollection': '使用已打开的收藏', 'swap': '交换主文件夹和备份',
   'exact': '检查每个文件的内容（较慢）',
   'exactHint': '不勾选时，两边子文件夹、名称、大小和日期都相同的文件被视为相同而不读取。勾选后，每一对可能的文件都会逐字节比较（SHA-256）。',
   'compare': '比较', 'compareAgain': '再次比较',
   'safe': '比较只读取。复制需要确认码，绝不替换文件，并将每个副本与原件核对。',
   'stage': {'scan': '正在列出文件夹… {count} 个文件', 'quick': '正在比较大小相同的文件… {done}/{total}', 'full': '正在读取完整文件以确认… {size} 的 {pct}%'},
   'tab': {'onlyMaster': '仅在主文件夹', 'both': '两边都有', 'onlyBackup': '仅在备份'},
   'tabHint': {'onlyMaster': '还不在备份中：复制它们以补全备份。', 'both': '两边都有的同一张照片，在同一子文件夹或其他位置。', 'onlyBackup': '在备份中但不在主文件夹：已从主文件夹删除，或从未在那里。'},
   'sub': {'missingInBackup': '备份中缺少', 'allBackedUp': '全部已备份', 'both': '{same} 在相同位置 · {elsewhere} 在其他位置', 'missingInMaster': '不在主文件夹中', 'nothingExtra': '没有多余内容'},
   'empty': {'onlyMaster': '主文件夹的所有照片都在备份中。', 'both': '没有照片同时在两边。', 'onlyBackup': '备份中没有主文件夹没有的内容。'},
   'samePlace': '相同位置', 'inBackupAt': '在备份的 {path}', 'copies': '{count} 个副本', 'rootFolder': '（主文件夹）',
   'layout': '副本的布局', 'layoutMirror': '相同的子文件夹', 'layoutDate': '按日期分文件夹（YYYY/YYYY-MM）',
   'copyToBackup': '将 {count} 个文件复制到备份…',
   'copyToMaster': '将 {count} 个文件复制到主文件夹…',
   'copyStarted': '正在后台复制 {count} 个文件（{size}）…',
   'copying': '正在复制 {done}/{total}…', 'copied': '已复制并核对 {count} 个文件（{size}）。',
   'more': '再显示 {count} 个'},
 'renameFile': {'eyebrow': '文件', 'title': '重命名“{name}”', 'label': '新名称（扩展名保持不变）', 'button': '重命名…'},
 'contextMenu': {'addToAlbum': '添加到相册', 'rename': '重命名…', 'renameOne': '一次只能重命名一个文件', 'category': '类别', 'sendLimbo': '移入待删区', 'restore': '放回照片', 'selected': '已选 {count} 个项目'},
 'projects': {'ofAlbum': '项目', 'noProject': '无项目', 'open': '打开项目', 'status': '状态', 'client': '委托方', 'clientPlaceholder': '机构、客户或课程', 'place': '地点', 'noPlace': '无地点', 'due': '截止日期', 'team': '团队', 'removeFromTeam': '将 {name} 移出团队', 'addToTeam': '添加人物…', 'noPeople': '“人物”中还没有人。', 'albumsCount': '{count} 个相册', 'checkBackup': '检查备份', 'newAlbum': '在项目中新建相册', 'addAlbum': '加入相册…', 'albumsTitle': '项目的 {count} 个相册', 'panel': '项目面板', 'all': '全部', 'noneInStatus': '没有处于此状态的项目。', 'st': {'active': '进行中', 'selecting': '挑选中', 'delivered': '已交付', 'archived': '已归档'}, 'stat': {'photos': '照片和视频', 'sorted': '已筛选', 'unsorted': '{count} 张未标记', 'noMark': '未标记', 'toDelete': '待删除', 'edited': '已编辑的 RAW', 'editedHint': '旁边有编辑版本', 'chosen': '已选入', 'chosenHint': '{albums}中的 {count} 张照片', 'alt': '有口述影像', 'altMissing': '相册中仍有 {count} 张没有', 'backup': '备份'}},
 'plugins': {'view': {'exportChosen': '导出所选 {count} 项…', 'selectAll': '全选', 'clear': '清除', 'pickHint': '点击要导出的相册和项目，或直接导出后再选择。', 'manage': '管理插件', 'version': '版本 {version}', 'empty': '还没有包含照片的相册或项目', 'emptyHint': '此插件可导出：{types}。先创建一个并加入照片。', 'tabTitle': '它的页面：导出相册和项目'}, 'eyebrow': '插件', 'title': '插件', 'hint': '将相册和项目导出为网页（HTML、CSS 和 JavaScript）的软件包。它们不会在 LionPhotos 内运行任何代码。', 'install': '安装插件…', 'installed': '已安装插件“{name}” {version}。', 'installFailed': '无法安装：{error}', 'removed': '插件已移除（在回收站中）。', 'remove': '移除', 'enable': '开启', 'disable': '关闭', 'none': '未安装导出插件', 'noneHint': '安装一个 .lionplugin 软件包，即可将相册和项目导出为网页。', 'noneInstalled': '未安装插件。', 'export': {'zip': '同时生成包含全部内容的 .zip', 'zipHint': '在文件夹旁生成一个包含页面和照片的文件，便于发送或附加。', 'zipDone': '全部内容的副本在“{zip}”中。', 'zipSkipped': '未生成 .zip（超过 4 GB）；文件夹中包含全部内容。', 'showZip': '显示 .zip', 'button': '导出…', 'buttonTitle': '用插件导出为网页', 'title': '用插件导出', 'which': '插件', 'what': '导出内容', 'size': '照片尺寸', 'sizePx': '最大 {n} 像素', 'sizeFull': '原始尺寸', 'originals': '包含原始文件', 'next': '选择文件夹并导出…', 'note': '会新建一个文件夹，包含网页和照片副本。你的照片不会被修改。', 'count': '{collections}中的 {count} 张照片', 'collections': '{count} 个相册或项目', 'empty': '没有可导出的内容：所选相册和项目中没有照片。', 'running': '正在导出…', 'progress': '{done} / {count} 张照片', 'done': '已将 {count} 张照片导出到“{folder}”。', 'someFailed': '{count} 张无法转换。', 'failed': '导出失败：{error}', 'canceled': '已取消导出。', 'openPage': '打开网页', 'showFolder': '在文件夹中显示'}},
 'crop': {'title': '裁剪和拉直', 'open': '裁剪和拉直…', 'canvasLabel': '带裁剪框的照片：在框内拖动可移动，拖动角和边可调整大小', 'levelHint': '沿地平线（或本应笔直的物体）画一条线', 'ratio': {'free': '自由', 'original': '原始'}, 'social': {'igPortrait': 'Instagram 竖版', 'igGrid': 'Instagram 网格', 'igSquare': 'Instagram 方形', 'story': '快拍、Reels、TikTok', 'youtube': 'YouTube 和屏幕', 'link': '链接（Facebook、LinkedIn）', 'pinterest': 'Pinterest', 'xHeader': 'X 封面', 'linkedinCover': 'LinkedIn 封面'}, 'swapTitle': '竖向 ↔ 横向 (X)', 'swap': '旋转比例', 'keepRatio': '保持比例', 'shape': '比例', 'socialTitle': '社交网络', 'rotateTitle': '旋转', 'rotateLeft': '向左 90°', 'rotateRight': '向右 90°', 'rotateLeftTitle': '逆时针旋转 90°', 'rotateRightTitle': '顺时针旋转 90°', 'straighten': '拉直', 'level': '按地平线校平', 'levelNote': '拖动滑块，或使用“校平”并在地平线上画一条线。双击滑块可回到 0°。', 'reset': '重置', 'apply': '应用', 'result': '结果：{size} 像素 · {ratio}', 'preparing': '正在准备照片…', 'cannot': '无法打开这张照片进行裁剪。', 'cropped': '已裁剪', 'turned': '已旋转 {deg}°', 'straightened': '已拉直 {deg}°', 'remove': '取消裁剪', 'removeTitle': '回到完整照片，不旋转也不拉直'},
 'trashlog': {'eyebrow': '清理', 'title': '回收站记录', 'lead': 'LionPhotos 移到系统回收站的文件，以及“待定区”释放了多少空间。清空回收站后磁盘才会收回空间。', 'loading': '正在读取记录…', 'emptyTitle': '还没有文件被移到回收站', 'emptyLead': '从待定区删除照片或删除重复副本后，它们会显示在这里，并附上释放的空间。', 'files': '{count} 个文件', 'freedByLimbo': '待定区释放', 'freedHint': '标记为删除并移到回收站的照片', 'thisMonth': '本月待定区', 'fromDuplicates': '重复文件', 'allSent': '移到回收站总计', 'unknownSize': '{count} 个未记录大小（旧版本）', 'byMonth': '待定区释放（按月）', 'byMonthHint': '有删除记录的最近 12 个月', 'noLimbo': '待定区还没有文件进入回收站。', 'listTitle': '移到回收站的文件', 'listCount': '{count} 个文件 · {size}', 'search': '按名称或文件夹搜索', 'nothingFound': '没有符合此筛选的文件。', 'showMore': '显示更多（剩余 {count} 个）', 'copy': '复制列表', 'copyTitle': '复制列表（日期、文件、文件夹、字节、来源）以粘贴到电子表格', 'copied': '已复制 {count} 行。', 'copyFailed': '无法复制列表。', 'col': {'when': '时间', 'file': '文件', 'folder': '文件夹', 'size': '大小', 'bytes': '字节', 'from': '来源'}, 'from': {'all': '全部', 'limbo': '待定区', 'duplicates': '重复', 'other': '选择', 'unknown': '—'}},
 'adjust': {'highlights': '高光', 'whites': '白色', 'blacks': '黑色', 'temperature': '色温', 'tint': '色调', 'vibrance': '鲜艳度', 'bw': '黑白', 'bwRed': '红色', 'bwGreen': '绿色', 'bwBlue': '蓝色', 'sharpness': '锐化', 'texture': '纹理', 'clarity': '清晰度', 'vignette': '暗角', 'groupChanged': '此组有调整', 'eyedropper': '吸管', 'eyedropperTitle': '白平衡：点击一个本应是灰色或白色的点', 'eyedropperHint': '点击照片中本应是灰色或白色的点（按 Esc 取消）。', 'auto': '自动', 'autoTitle': '根据照片本身计算曝光、白色、黑色、对比度和鲜艳度', 'presets': '预设', 'presetsTitle': '带名称保存的调整，可用于其他照片', 'presetSave': '保存这张照片的调整…', 'presetSaveTitle': '新预设', 'presetName': '名称', 'presetSaveConfirm': '保存', 'presetSaved': '已保存预设“{name}”。', 'presetDelete': '删除预设', 'bwTitle': '将照片转为黑白；下方滑块可调亮或调暗各颜色', 'detailNoGpu': '由于 GPU 启动出错，无法启用锐化、纹理和清晰度。', 'compare': '前后对比', 'compareTitle': '前后对比：拖动分隔线进行比较', 'before': '之前', 'after': '之后', 'group': {'light': '光线', 'color': '颜色', 'detail': '细节', 'effects': '效果'}, 'applying': '正在应用调整…', 'title': '调整', 'exposure': '曝光', 'contrast': '对比度', 'shadows': '阴影', 'saturation': '饱和度', 'resetOne': '双击：恢复为 0', 'reset': '重置', 'none': '无调整', 'edited': '已编辑', 'someAdjusted': '{total} 张中已调整 {count} 张', 'allSelected': '移动滑块会将该值应用到所选的 {count} 张照片。', 'copy': '复制调整', 'copied': '已复制调整：可粘贴到其他照片。', 'paste': '粘贴调整', 'pasteMany': '粘贴到 {count} 张照片', 'pasteTitle': '将复制的调整应用到所选的 {count} 张照片', 'save': '保存编辑副本…（{count}）', 'saveTitle': '在原图旁新建一个带元数据的 JPEG；原图不变', 'rendering': '正在生成编辑后的照片…', 'renderingN': '正在生成 {done}/{total}…', 'cannotSave': '这些照片无法在此以原尺寸生成（仅支持 JPEG、PNG、WebP… 以及带相机 JPEG 的 RAW）。', 'viewerNote': '已在 LionPhotos 中调整 · 按住 \\ 查看原图'},
 'describe': {'writeNothing': '尚未在 LionPhotos 中填写任何可写入文件的内容（显示的内容来自文件本身）。', 'mixedShort': '值不相同 — 输入的内容将应用到全部', 'fromFileBadge': '来自文件', 'fromFileTitle': '照片自身元数据中的内容；修改即可写入你自己的', 'pendingTitle': '已在 LionPhotos 中填写，尚未写入文件', 'pending': '{count} 个字段尚未写入文件', 'mixedPick': '查看各个值并选一个应用到全部', 'different': '{count} 个不同', 'emptyValue': '（空）', 'noneYet': '尚无描述', 'inSome': '{value}（{total} 张中的 {n} 张）', 'noAlt': '没有音频描述', 'missingOf': '{total} 张中有 {count} 张没有音频描述', 'noAuthorPlace': '尚无作者和地点', 'keywordsAdd': '添加…', 'keywordRemove': '移除“{word}”', 'moreFields': '更多字段：职务、说明事项', 'lessFields': '较少字段', 'undoWhat': '撤销：{what}（{count} 张）', 'undoTitle': '撤销上一次更改（Ctrl+Z）', 'redo': '重做', 'redoTitle': '重做（Ctrl+Shift+Z）', 'undone': '已撤销（{count} 张照片）：{what}。', 'redone': '已重做（{count} 张照片）：{what}。', 'changedMany': '已更改 {count} 张照片：{what}。', 'nothingToUndo': '没有可撤销的内容。', 'nothingToRedo': '没有可重做的内容。', 'headline': '标题', 'headlineHint': '一句话概括照片，不含地点和日期', 'authorTitle': '职务', 'authorTitleHint': '摄影师、实习生…', 'placeTitle': '作者和地点', 'sublocation': '地点（具体位置）', 'sublocationHint': '例如：会议中心，主校区', 'city': '城市', 'state': '省/州', 'country': '国家/地区', 'keywords': '关键词', 'keywordsHint': '用逗号分隔', 'instructions': '说明', 'instructionsHint': '禁发期、使用限制…', 'fromFile': '照片元数据中：{value}', 'allSelected': '这里填写的内容适用于所选的 {count} 张照片。', 'write': '写入 {count} 个文件…', 'writeHint': '将这些元数据写入文件，供其他程序使用：JPEG 写入文件内部；其他格式写入旁边的 .xmp 文件', 'author': '作者', 'authorHint': '拍摄者——用于导出页面的署名', 'authorFromCamera': '照片元数据中：{name}', 'title': '描述', 'caption': '照片描述', 'captionHint': '照片展示了什么（图注）', 'alt': '口述影像', 'altHint': '为看不见图片的人描述它——屏幕阅读器会朗读这段文字', 'mixed': '文字各不相同——在此输入的内容将应用到全部', 'inFile': '文件中：“{text}”', 'useFile': '使用', 'missing': '{count} 项没有口述影像', 'missingShort': '{count} 项无口述影像'},
 'folderAlbums': {'button': '从文件夹…', 'buttonTitle': '根据收藏中的文件夹创建相册', 'fromFolder': '根据此文件夹创建相册', 'title': '根据文件夹创建相册', 'lead': '每个勾选的文件夹创建一个相册，使用文件夹的名称。', 'leadFolder': '在“{folder}”中，每个勾选的文件夹创建一个相册。', 'modeLabel': '哪些文件夹', 'mode': {'top': '第一层', 'leaf': '含有照片的文件夹', 'none': '我自己选'}, 'modeHint': {'top': '其下的每个文件夹（连同子文件夹）成为一个相册。', 'leaf': '每个本身含有照片的文件夹成为一个相册。', 'none': '未勾选：请勾选下面的文件夹。'}, 'withParent': '名称带上级文件夹（“意大利 · 罗马”）', 'listLabel': '文件夹', 'already': '已是相册', 'nameTaken': '已有同名相册', 'create': '创建 {count} 个相册', 'createNone': '请勾选文件夹', 'photos': '{count} 张照片', 'note': '每个相册都与整个文件夹关联：之后放入该文件夹的照片也会进入相册。只更改 LionPhotos 的目录，不会移动或复制任何文件。', 'done': '已根据文件夹创建 {count} 个相册。', 'show': '查看相册'},
 'openWith': {'title': '打开方式', 'open': '打开', 'searching': '正在查找程序…', 'none': '未找到照片或视频程序', 'default': '默认程序', 'system': '选择其他应用…', 'other': '其他程序…', 'manyTitle': '在 {app} 中打开 {count} 个文件？', 'manyMessage': '每个文件都会在该程序中打开，照片很多时可能需要一些时间。', 'failed': '无法在 {app} 中打开：{error}'},
 'renameFolder': {'eyebrow': '文件夹', 'button': '重命名文件夹（F2）', 'title': '重命名“{name}”', 'label': '新名称', 'next': '继续'},
 'limbo': {'title': '待删区', 'lead': '标记为待删除的照片和视频在这里等待，不显示在照片中，直到你决定：删除（移到回收站，需输入确认码）或放回。',
   'items': '待删区中有 {count} 个文件', 'restoreAll': '全部放回照片', 'restoreTitle': '离开待删区：放回照片',
   'send': '移入待删区', 'sendTitle': '所选照片离开照片视图，在待删区等待，直到你删除或放回它们',
   'restoreSelected': '放回照片',
   'confirmOne': '确定将文件“{name}”移入待删区？', 'confirmMany': '确定将所选的 {count} 个文件移入待删区？',
   'confirmMessage': '它会离开照片视图，在待删区等待，直到你删除（回收站）或放回。文件本身不会有任何变化。',
   'empty': '待删区是空的', 'emptyHint': '将一张照片标记为待删除（缩略图上的垃圾桶，或按 3 键），它就会在这里等待。'},
 'convert': {
   'eyebrow': 'HEIC 照片', 'button': '转为 JPG/PNG…', 'buttonTitle': '为所选 HEIC 照片创建 JPG 或 PNG 副本',
   'title': '转换 {count} 张 HEIC 照片',
   'message': '会在每张照片旁写入一个全分辨率的新文件。原始 HEIC 保持不变。',
   'jpg': 'JPG：兼容性最好', 'jpgDetail': '在任何地方都能打开（Windows、网站、印刷店、旧程序）。质量 95%：没有可见损失。',
   'png': 'PNG：无损', 'pngDetail': '每个像素都与解码结果完全一致。文件大好几倍。',
   'note': '拍摄日期、相机、镜头和位置（EXIF）以及色彩配置文件都会保留，颜色保持一致。',
   'next': '继续'},
 'ops': {'edit': {'saved': '已保存 {count} 个编辑副本。', 'undone': '{count} 个编辑副本已移到回收站。'}, 'writeMeta': {'undone': '{count} 个文件已恢复为写入前的样子。', 'done': '已将元数据写入 {count} 个文件。', 'inside': '{count} 个写入图像内部（JPEG）。', 'sidecars': '{count} 个写入旁边的 .xmp 文件。'}, 'renameFile': {'done': '文件已重命名为“{name}”。'}, 'renameFolder': {'done': '文件夹已重命名为“{name}”。'},
   'convert': {'started': '正在后台将 {count} 张照片转换为 {format}…',
   'done': '已将 {count} 张照片转换为 {format}。'},
   'trash': {'done': '已将 {count} 个文件移到回收站（{size}）。'},
   'organize': {'done': '已整理 {count} 个项目。'},
   'move': {'done': '已移动 {count} 个文件。'},
   'undo': {'': '撤消', 'done': '已还原 {count} 个文件。'},
   'failed': '{count} 个无法更改。',
   'clearCache': {'done': '缓存已清除。正在重新创建缩略图。'}},
 'confirm': {
   'bytes': {'trash': {'title': '这 {count} 个文件占用', 'hint': '清空回收站后在磁盘上释放。'},
             'backupCopy': {'title': '{count} 个文件待复制', 'hint': '已检查目标位置的可用空间。'}},
   'eyebrow': '确认', 'codeLabel': '要确认，请输入下面的代码（不能粘贴）：', 'inputLabel': '输入代码 {code}',
   'pasteDisabled': '请输入代码——粘贴已禁用。', 'running': '正在处理…', 'failed': '无法完成操作。',
   'more': '… 还有 {count} 个', 'skipped': '跳过了 {count} 个项目（已在位置上或不存在）。'},
 'about': {'title': '关于 LionPhotos', 'version': '版本 {version}', 'createdBy': '由 {author} 创建和构思',
   'team': '© {year} LionPhotos Team', 'license': '采用 MIT 许可证开源。按“原样”提供，不提供任何担保。',
   'privacy': '无需网络即可使用：无需账户，没有遥测。缩略图和元数据保存在本地文件中。',
   'fonts': '字体：Plus Jakarta Sans 和 JetBrains Mono（SIL Open Font License）。'},
 'main': {'edit': {'suffix': '-已编辑', 'title': '保存 {count} 个编辑副本', 'message': '在每张原图旁新建一个 JPEG，包含调整、原图的元数据以及在 LionPhotos 中填写的内容。', 'confirm': '保存副本', 'note': '原图不会改变。', 'skipped': '{count} 张照片无法在此生成，已略过。', 'nothing': '没有可保存的内容。', 'summary': '已保存 {count} 个编辑副本', 'undoTitle': '将 {count} 个编辑副本移到回收站？', 'undoMessage': '创建的副本将移到回收站；原图保持不变。', 'toBin': '移到回收站', 'undoNothing': '副本已被更改或已不存在：没有可撤销的内容。'}, 'meta': {'undo': {'title': '撤销对 {count} 个文件的写入', 'message': '文件将完全恢复为写入元数据之前的样子。在 LionPhotos 中填写的内容仍保留在目录中。', 'inside': '之前的版本，逐字节一致', 'sidecarMade': '由写入创建：移到回收站', 'sidecarBack': '恢复之前的文本', 'note': '当前版本将移到回收站。', 'changed': '{count} 个文件在写入后被更改，保持不变。', 'nothing': '这些文件在写入后已被更改（或已不存在）：没有可撤销的内容。'}, 'write': {'title': '将元数据写入 {count} 个文件', 'message': '在 LionPhotos 中填写的内容（作者、图片说明、音频描述、地点、关键词…）将写入文件，供其他程序查看。', 'inside': '写入图像内部', 'sidecar': '写入旁边的 {name}', 'confirm': '写入元数据', 'noteInside': 'JPEG：元数据写入文件内部；图像本身不变，旧版本移到回收站。', 'noteSidecar': '其他格式：原文件不会被修改；数据写入旁边的 .xmp 文件。', 'skipped': '{count} 张照片没有在 LionPhotos 中填写的元数据，保持不变。', 'nothing': '这些照片都没有在 LionPhotos 中填写的元数据。', 'tooLarge': '元数据太大，无法放入 JPEG。', 'summary': '已将元数据写入 {count} 个文件'}}, 
   'common': {'rootFolder': '（收藏文件夹）'},
   'labels': {'errors': {'noName': '请输入名称。'}},
   'dialog': {'pickFolder': {'title': '打开一个照片和视频文件夹'}},
   'plugins': {'pickTitle': '选择插件（.lionplugin）', 'fileType': 'LionPhotos 插件', 'destTitle': '在哪里创建导出文件夹', 'errors': {'notZip': '该文件不是有效的软件包。', 'tooBig': '软件包太大。', 'tooManyFiles': '软件包中的文件太多。', 'encrypted': '软件包受密码保护。', 'compression': '软件包使用了不支持的压缩方式。', 'badPath': '软件包中有无效路径：{detail}', 'unexpectedFile': '软件包中有不允许的文件：{detail}', 'fileType': '不允许的文件类型：{detail}', 'manifest': 'plugin.json 不完整或无效（{detail}）。', 'noManifest': '软件包中没有 plugin.json。', 'noEntry': '软件包中没有页面 {detail}。'}, 'install': {'title': '安装插件“{name}” {version}', 'message': '作者：{author}。它包含一个网页模板和图片；不会在 LionPhotos 内运行任何内容。', 'replaces': '它将替换版本 {version}，旧版本会移到回收站。', 'confirm': '安装', 'note': '只安装你信任的人提供的插件：导出的网页会在打开者的浏览器中运行插件的 JavaScript。'}, 'remove': {'title': '移除插件“{name}”', 'message': '插件文件夹将移到回收站。已导出的网页保持不变。', 'confirm': '移除'}, 'export': {'noteZip': '会在旁边生成一个包含全部内容的 .zip。', 'title': '用“{name}”导出 {count} 张照片', 'message': '将在 {folder} 中新建一个文件夹。', 'photos': '{count} 张照片', 'confirm': '导出', 'note': '会生成照片的缩小副本；原始文件不会被修改。', 'noteOriginals': '原始文件也会被复制；它们不会被修改。', 'nothing': '没有可导出的内容。', 'busy': '已有一个导出正在进行。', 'summary': '将 {count} 张照片导出到 {folder}'}},
   'openWith': {'title': '选择用来打开的程序', 'programs': '程序'},
   'library': {'errors': {'noFolder': '请先打开一个文件夹。', 'notFolder': '找不到文件夹：{folder}'}},
   'backup': {'errors': {'noFolder': '请选择一个已存在的文件夹。', 'same': '主文件夹和备份是同一个文件夹。',
     'nested': '一个文件夹在另一个文件夹内：请选择两个独立的文件夹。', 'expired': '比较结果已过时：请重新比较。',
     'nothing': '没有要复制的内容：都已存在。', 'noSpace': '可用空间不足：需要 {need}，可用 {free}。'}},
   'ops': {
     'errors': {'unknownOperation': '未知操作。', 'expired': '此确认已过期。请重新开始。', 'tooManyAttempts': '错误代码过多：操作已取消。',
       'wrongCode': '代码错误。请检查后重新输入。', 'tooManyFiles': '一次操作中的文件过多。', 'noFreeName': '目标位置没有可用的文件名。'},
     'trash': {'title': '将 {count} 个文件移到回收站？',
       'message': '{count} 个文件（{size}）将移到回收站。你可以从那里还原。',
       'confirm': '移到回收站', 'summary': '{count} 个文件移到回收站',
       'errors': {'noneSelected': '请至少选择一个项目。', 'allMissing': '这 {count} 个文件都已不存在。'}},
     'organize': {'title': '将 {count} 个项目按日期整理到文件夹？',
       'message': '{count} 个项目将在收藏内移动到 {folders}。',
       'folders': '{count} 个文件夹', 'confirm': '整理', 'already': '{count} 个项目已在其文件夹中。',
       'summary': '已按日期整理 {count} 个项目',
       'errors': {'noneSelected': '请至少选择一个项目。', 'noTheme': '请输入文件夹的主题。', 'nothingToMove': '一切都已就位：没有要移动的。'}},
     'move': {'title': '移动 {count} 个文件？', 'message': '{count} 个文件将移到 {folder}。',
       'related': '包括同一批照片的 {count} 个相关文件。',
       'confirm': '移动', 'summary': '已将 {count} 个文件移到 {folder}',
       'errors': {'noneSelected': '请至少选择一个项目。', 'noFolder': '请选择目标文件夹。', 'badName': '文件夹名称包含不允许的字符。'}},
     'undo': {'title': '还原 {count} 个文件？', 'message': '撤消：{summary}。', 'confirm': '撤消',
       'errors': {'notUndoable': '此操作无法在这里撤消。', 'alreadyUndone': '此操作已撤消。', 'nothingToUndo': '文件已被移动或更改：没有可还原的内容。'}},
     'backupCopy': {'titleToBackup': '将 {count} 个文件复制到备份？',
       'titleToMaster': '将 {count} 个文件复制到主文件夹？',
       'message': '{count} 个文件（{size}）将复制到 {folder}（{folders}）。每个副本都与原件核对（SHA-256）；不会替换任何文件。',
       'confirm': '复制', 'summary': '已将 {count} 个文件复制到 {folder}'},
     'renameFile': {'title': '将“{from}”重命名为“{to}”？', 'message': '文件将在磁盘上重命名。缩略图、标记、标签和人脸都会保留。可以撤消。',
       'messageSidecars': '文件及其 {count} 个附属文件（Lightroom/DxO）将在磁盘上重命名。照片保留缩略图、标记、标签和人脸。可以撤消。',
       'summary': '文件“{from}”已改为“{to}”',
       'errors': {'noFile': '此文件不在已打开的收藏中。', 'sameName': '文件已经是这个名称。', 'extension': '请保留扩展名 {ext}：重命名不会转换文件。'}},
     'renameFolder': {'title': '将“{from}”重命名为“{to}”？',
       'message': '文件夹 {folder} 将在磁盘上重命名。其中的 {count} 个项目保留缩略图、标记和标签。',
       'confirm': '重命名', 'summary': '文件夹“{from}”已改为“{to}”',
       'errors': {'noFolder': '请选择收藏内的文件夹（收藏本身需在 LionPhotos 之外重命名）。', 'badName': '请使用不含 \\ / : * ? " < > | 且不以点或空格结尾的名称。',
                  'sameName': '文件夹已经是这个名称。', 'exists': '那里已有名为“{name}”的文件夹或文件。'}},
     'convert': {'titleJpg': '将 {count} 张 HEIC 照片转换为 JPG？',
       'titlePng': '将 {count} 张 HEIC 照片转换为 PNG？',
       'message': '将在原件旁写入 {count} 个全分辨率的新文件，包含 EXIF 数据和色彩配置文件。原件不会被修改。',
       'confirm': '转换', 'summary': '已将 {count} 张 HEIC 照片转换为 {format}',
       'errors': {'noneSelected': '请至少选择一张 HEIC 照片。'}},
     'clearCache': {'title': '清除缩略图缓存？', 'message': '{thumbs}和{previews}（{size}）将被清除。你的照片和视频不会被修改；需要时会重新创建缩略图。',
       'thumbs': '{count} 张缩略图', 'previews': '{count} 个视频预览', 'confirm': '清除缓存'}}},
}

# 1.23.0: export photos
def _merge(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict) and not set(v) <= {'one', 'other'}: _merge(a[k], v)
        else: a[k] = v
_merge(MESSAGES, {'export': {'menu': '导出照片…', 'button': '导出照片', 'buttonTitle': '将照片连同调整和裁剪导出为新文件（Ctrl+E）', 'eyebrow': '导出', 'title': '导出 {count} 张照片', 'edited': '{count} 张有调整或裁剪。', 'noneEdited': '没有照片经过调整：将按原样以所选格式导出。', 'skipped': '{count} 项（视频或无法绘制的格式）不导出。', 'nothing': '没有可导出的内容：视频和此处无法绘制的格式不导出。', 'preset': '预设', 'presets': {'social': '社交网络', 'socialHint': 'JPEG 90，1080 × 1350，屏幕锐化，不含位置', 'client': '交付客户', 'clientHint': 'JPEG 95，原始尺寸，全部元数据', 'print': '打印', 'printHint': 'TIFF，原始尺寸，打印锐化，仅作者', 'web': '网页', 'webHint': 'JPEG 85，2048 像素，屏幕锐化，不含位置', 'save': '存为预设…', 'saveTitle': '新的导出预设', 'name': '名称', 'saveConfirm': '保存', 'removeHint': '右键：删除此预设'}, 'where': '目标', 'noFolder': '尚未选择文件夹', 'chooseFolder': '选择文件夹…', 'subfolder': '放在新文件夹中', 'file': '文件', 'format': '格式', 'formats': {'jpeg': 'JPEG', 'jpegHint': '用于屏幕、社交网络和大多数交付', 'png': 'PNG', 'pngHint': '无损，文件较大', 'tiff': 'TIFF', 'tiffHint': '无损，用于打印和其他编辑软件（8 位）'}, 'quality': '质量', 'size': '尺寸', 'longSide': '长边像素', 'sizes': {'original': '原始尺寸', 'long': '长边…', 'igPortrait': 'Instagram 竖图（1080 × 1350）', 'story': 'Stories、Reels（1080 × 1920）', 'hd': '全高清（1920 × 1080）', 'uhd': '4K（3840 × 2160）', 'print10x15': '冲印 10 × 15 厘米（300 dpi）', 'print13x18': '冲印 13 × 18 厘米（300 dpi）', 'print20x30': '冲印 20 × 30 厘米（300 dpi）'}, 'sharpen': '输出锐化', 'sharpenOf': {'none': '无', 'screen': '用于屏幕', 'print': '用于打印'}, 'names': '文件名', 'pattern': '命名规则', 'patternReset': '默认', 'pieces': {'date': '拍摄日期（2026-07-24）', 'work': '相册或项目', 'author': '摄影师（LionPhotos 中的作者，否则为相机记录的）', 'number': '导出中的序号（001、002…）', 'name': '原始文件名'}, 'work': '相册或项目', 'workPlaceholder': '用于 {álbum} 的名称', 'ascii': '去掉重音符号', 'keepName': '保留原始文件名', 'preview': '前几个文件名', 'noAuthorHint': '有些照片没有作者：它们的文件名中不含摄影师。', 'metadata': '元数据', 'modes': {'all': '全部', 'allHint': '相机、地点、作者和描述', 'noGps': '不含位置', 'noGpsHint': '除 GPS 外全部：用于社交网络', 'author': '仅作者', 'authorHint': '拍摄者的姓名和职务', 'none': '无', 'noneHint': '只有图像及其颜色配置文件'}, 'watermark': '用文字为照片署名', 'watermarkText': '文字', 'watermarkPlaceholder': '© 摄影师姓名', 'watermarkPlace': '位置', 'opacity': '不透明度', 'places': {'bottomRight': '右下', 'bottomLeft': '左下', 'topRight': '右上', 'topLeft': '左上', 'center': '居中'}, 'next': '导出…', 'running': '正在导出照片…', 'runningN': '正在导出第 {done} 张，共 {total} 张…', 'done': '已将 {count} 张照片导出到“{folder}”（{size}）。', 'cancelled': '导出已取消；已完成的照片会保留。', 'openFolder': '打开文件夹'}, 'ops': {'export': {'undone': '{count} 张导出的照片已移到回收站。'}}, 'main': {'dialog': {'pickExportFolder': {'title': '导出到的文件夹'}}, 'export': {'title': '导出 {count} 张照片', 'message': '在“{folder}”中生成新文件，包含调整和裁剪。原图不会改变。', 'confirm': '导出', 'mode': {'all': '包含全部元数据。', 'noGps': '不含拍摄地点。', 'author': '文件中只写入作者。', 'none': '文件中不含元数据。'}, 'noAuthor': '{count} 张照片没有作者。', 'skipped': '{count} 项不导出。', 'summary': '已将 {count} 张照片导出到“{folder}”', 'undoTitle': '将 {count} 张导出的照片移到回收站？', 'undoMessage': '导出的文件将移到回收站；原图保持不变。', 'undoNothing': '导出的文件已更改或不存在：没有可撤消的内容。', 'errors': {'noFolder': '请选择要导出到的文件夹。', 'nothing': '没有可导出的内容。', 'readOnly': 'LionPhotos 无法写入“{folder}”。', 'session': '此次导出已结束；请重新开始。', 'full': '磁盘已满。'}}}})
# 1.23.0: organize renames
_merge(MESSAGES, {'organize': {'rename': '重命名文件', 'renameHint': '在磁盘上为每张照片起新名称。同一张照片的 RAW、JPEG 和 .xmp 保持同名。', 'namePattern': '命名规则', 'work': '相册或工作（用于 {álbum}）', 'workPlaceholder': '例如：毕业典礼', 'nameExample': '第一张照片：', 'renameNote': '在每个文件夹中按日期编号。不会覆盖任何文件；撤消可恢复原来的名称和文件夹。', 'sameHint': '文件留在原文件夹中，只改为新名称。', 'rootFolder': '（收藏文件夹）', 'runRename': '重命名 {count} 项', 'pattern': {'same': '保留文件夹'}}, 'main': {'ops': {'organize': {'renameMessage': '{count} 个文件将在原文件夹中获得新名称。', 'renameAlso': '文件也会获得新名称。'}}}})
# 1.24.0: reorganize the collection
_merge(MESSAGES, {'reorganize': {'introTitle': '重新整理整个收藏', 'introLead': 'LionPhotos 会读取目前的文件夹结构，并在磁盘上提出统一的结构：每个活动一个文件夹放在所属年份中，长期主题放在一起，待整理的内容和器材测试单独存放。移动任何文件之前，您都可以先检查全部内容。', 'introSample': '2025/2025-12-24-圣诞 · 主题/Noah · _待整理 · _器材', 'analyze': '分析收藏', 'analyzing': '正在分析…', 'eyebrow': '重新整理', 'title': '“{name}”的方案', 'summary': '已读取 {count} 项，分布在 {folders}中。', 'foldersN': '{count} 个文件夹', 'again': '重新分析', 'close': '关闭', 'options': {'themes': {'label': '长期主题', 'folder': '放在“主题/”中', 'year': '放在开始的年份中'}, 'loose': {'label': '零散照片', 'events': '按日期分组', 'inbox': '放到 _待整理'}, 'spheres': '以“个人”和“工作”作为顶层文件夹'}, 'sections': {'event': '活动', 'theme': '长期主题', 'loose': '零散照片，按日期分组', 'typed': '视频归入其活动', 'inbox': '待整理', 'gear': '器材测试', 'keep': '保持不变'}, 'sectionHints': {'event': '年 / 日期-名称', 'theme': '同一主题持续数月', 'loose': '间隔超过一天则开始新的一组', 'typed': '按每个文件的日期', 'inbox': '按文件夹名称', 'gear': '按文件夹名称', 'keep': '已在正确位置，或不是照片'}, 'looseFrom': '{folder} 中有 {count} 个零散项', 'destLabel': '{folder} 的新位置', 'include': '重新整理 {folder}', 'photos': '{count} 张照片', 'videos': '{count} 个视频', 'items': '{count} 项', 'reasons': {'chosen': '已在此结构的文件夹中', 'noPhotos': '没有照片', 'documents': '几乎都是文档：不移动', 'inbox': '名称表明待整理', 'gear': '名称表明是测试', 'eventDay': '一天', 'eventDays': '{days} 天', 'theme': '{days} 天：长期主题', 'organized': '已整理', 'typed': '与活动日期相同', 'loose': '零散地放在年份或月份文件夹中', 'looseInbox': '零散地放在年份或月份文件夹中'}, 'after': '整理后', 'afterHint': '“{name}”整理后的样子（新文件夹已标出）。', 'footNote': '整个文件夹会连同其中的所有内容（RAW、.xmp、文档）一起移动。相册、人物和分类会随之保留。一次操作，需要输入验证码，可以撤消。', 'apply': '重新整理 {count} 项（{folders}）…', 'nothing': '没有需要移动的内容'}, 'ops': {'reorganize': {'done': '收藏已重新整理：移动了 {count} 项（{folders}）。', 'folders': '{count} 个文件夹'}}, 'main': {'ops': {'reorganize': {'errors': {'noCollection': '请先打开一个收藏。', 'nothing': '没有需要移动的内容：一切都已在正确位置。', 'badName': '文件夹名称“{name}”无法使用（含有 Windows 不接受的字符，或为空）。'}, 'folders': '{count} 个完整文件夹', 'title': '重新整理收藏', 'message': '{count} 项将在磁盘上移动位置：{folders}和{files}。', 'files': '{count} 个零散文件', 'confirm': '重新整理', 'summary': '收藏已重新整理（{count} 次移动）'}}}})
_merge(MESSAGES, {'main': {'ops': {'reorganize': {'dirs': {'themes': '主题', 'inbox': '_待整理', 'gear': '_器材', 'personal': '个人', 'professional': '工作', 'loose': '零散'}}}}})
_merge(MESSAGES, {'reorganize': {'reasons': {'subject': '包含多个活动的主题文件夹：保留不动，其中的活动加上日期'}}})
# 1.24.1: progress and stop
_merge(MESSAGES, {'confirm': {'progress': '{done} / {total}（{percent}%）', 'stop': '停止', 'stopping': '正在停止…'}, 'ops': {'stopped': '已停止：已完成的部分保留（可以撤消）。'}, 'main': {'ops': {'organize': {'mixNote': '这些文件将离开 {count} 个有名称的文件夹：其中的照片会与同月的其他照片混在一起。要让每个活动保留在自己的文件夹中，请使用“重新整理收藏”。'}}}})
# 1.24.2: viewer labels in the bar
_merge(MESSAGES, {'viewer': {'rawChip': '相机 JPEG · {size}'}, 'adjust': {'viewerChip': '已调整'}})

# 1.24.3: albums and projects in the side bar
_merge(MESSAGES, {'sidebar': {'albumsInYear': '{count} 个含 {year} 年照片的相册', 'projectsInYear': '{count} 个含 {year} 年照片的项目'}})
# 1.25.0: album suggestions
_merge(MESSAGES, {'albumSuggest': {'button': '推荐相册', 'buttonTitle': '根据事件和照片内容推荐的相册，供您查看', 'eyebrow': '推荐', 'title': '推荐的相册', 'lead': '一起拍摄的照片会被归为事件，并根据其内容命名：文件夹、照片内容、日期、地点和人物。保留您想要的，并修改名称。磁盘上不会有任何改动。', 'again': '重新推荐', 'close': '关闭', 'working': '正在查看照片…', 'empty': '没有推荐', 'emptyHint': '照片已在相册中，或分组太小。', 'footNote': '相册只存在于 LionPhotos 目录中：照片保持原位。', 'create': '创建 {count} 个相册', 'nothing': '未选择', 'created': '已创建 {count} 个相册。', 'nameLabel': '相册名称', 'include': '创建“{name}”', 'selectAll': '全选', 'selectNone': '全不选', 'more': '再显示 {count} 个', 'days': '共 {count} 天', 'sections': {'event': '事件', 'theme': '跨年份的主题'}, 'sectionHints': {'event': '一起拍摄的照片', 'theme': '不同日期的同一主题'}, 'content': {'title': '照片的内容', 'none': '尚未分析：推荐来自文件夹、地点和日期。', 'done': '已分析 {count} 项中的 {done} 项。', 'running': '正在分析… {total} 项中的 {done} 项', 'runningHint': '完成后会重新生成推荐。', 'hint': '在这台电脑上根据缩略图完成。不会更改任何文件，也不会发送任何内容。', 'unsupported': '这台电脑没有 LionPhotos 可用于此的显卡：推荐来自文件夹、地点和日期。', 'start': '分析照片', 'more': '分析其余照片', 'pause': '暂停', 'resume': '继续'}, 'reasons': {'shown': '{percent}% 的照片有{theme}', 'shownTitle': '从缩略图读取的照片内容', 'words': '名称中有{theme}', 'date': '按日期为{theme}', 'big': '这些日期的照片很多'}, 'names': {'folder': '{folder} {year}', 'folderOnly': '{folder} {year}', 'folderWhen': '{folder} · {when}', 'celebrationOf': '{person}的{theme} {year}', 'themeDay': '{theme} · {when}', 'holiday': '{theme} {year}', 'placeWhen': '{place} · {when}', 'themeWhen': '{theme} · {when}', 'when': '{when}', 'theme': '{theme}'}, 'themes': {'wedding': '婚礼', 'birthday': '生日', 'graduation': '毕业典礼', 'baptism': '洗礼', 'christmas': '圣诞节', 'newyear': '跨年', 'carnival': '狂欢节', 'easter': '复活节', 'baby': '宝宝', 'party': '聚会', 'beach': '海滩', 'mountain': '山', 'snow': '雪', 'lake': '湖泊与河流', 'countryside': '乡村', 'city': '城市', 'music': '音乐与演出', 'sport': '运动', 'food': '美食', 'nature': '花卉与植物', 'wildlife': '动物', 'pets': '猫狗', 'cars': '汽车与摩托车', 'planes': '飞机', 'trains': '火车', 'boats': '船', 'documents': '文件与截图'}}})
# 1.25.0: related files left behind
_merge(MESSAGES, {'regroup': {'title': '遗留的关联文件', 'lead': '照片被移动或重命名后，单独留在文件夹中的 .xmp（Lightroom、Camera Raw）、.dop（DxO）等文件会回到照片旁边，并使用照片的名称。它属于哪张照片，依据操作历史或 .xmp 本身（RAW 文件名和拍摄时间）判断。', 'run': '查找并归位…'}, 'ops': {'regroup': {'done': '已将 {count} 个关联文件放回照片旁。'}}, 'main': {'ops': {'regroup': {'title': '将 {count} 个关联文件放回照片旁？', 'message': '每个文件都会移到其照片所在的文件夹，并使用照片的名称（RAW 的编辑保持不变）。可以撤销。', 'confirm': '归位', 'summary': '已将 {count} 个关联文件放回照片旁', 'unmatched': '另外 {count} 个无法确定对应的照片，保持原位。', 'errors': {'none': '没有遗留的关联文件：每个 .xmp 和 .dop 都在其照片旁。', 'noneMatched': '有 {count} 个关联文件被遗留，但无法确定对应的照片：没有要移动的文件。'}}}}})
# 1.26.0: short dates, countries and continents in album names
_merge(MESSAGES, {'albumSuggest': {'names': {'folderWhen': '{folder} {when}', 'themeDay': '{theme} {when}', 'placeWhen': '{place} {when}', 'themeWhen': '{theme} {when}', 'countryWhen': '{country} {when}', 'twoCountriesWhen': '{country}和{country2} {when}', 'continentWhen': '{continent} {when}'}, 'continents': {'africa': '非洲', 'antarctica': '南极洲', 'asia': '亚洲', 'europe': '欧洲', 'northAmerica': '北美洲', 'centralAmerica': '中美洲', 'southAmerica': '南美洲', 'oceania': '大洋洲'}}})
# 1.26.1: people in album names
_merge(MESSAGES, {'albumSuggest': {'names': {'celebrationOf': '{theme} · {who} {year}', 'themeDayWho': '{theme} · {who} {when}', 'themeWhenWho': '{theme} · {who} {when}', 'placeWhenWho': '{place} · {who} {when}', 'countryWhenWho': '{country} · {who} {when}', 'twoCountriesWhenWho': '{country}和{country2} · {who} {when}', 'continentWhenWho': '{continent} · {who} {when}', 'whoWhen': '{who} {when}', 'whoYear': '{who} {year}'}, 'both': '{a}和{b}', 'sections': {'person': '全年出现的人'}, 'sectionHints': {'person': '一年中多个月份都出现的人'}, 'months': '{count} 个月'}})
# 1.26.1: preview of a suggestion
_merge(MESSAGES, {'albumSuggest': {'preview': {'open': '查看全部照片（大图）', 'button': '查看照片', 'toggle': '单击：从相册移除（或放回）· 双击：打开', 'zoom': '放大打开', 'hint': '单击照片即可移除', 'keepAll': '全部保留', 'done': '完成', 'removedCount': '已移除 {count} 张'}}})
# 1.26.2: merge two albums
_merge(MESSAGES, {'albums': {'merge': {'button': '与另一个相册合并…', 'title': '合并“{name}”', 'lead': '“{name}”中的 {count} 项将移到所选相册，“{name}”将不再存在。', 'with': '合并到', 'search': '查找相册', 'noMatch': '没有这个名称的相册', 'name': '合并后的相册名称', 'summary': '将有 {count} 项。', 'summaryCommon': '将有 {count} 项（{common} 已同时在两个相册中）。', 'note': '只有目录会变化：没有文件会移动。所选相册保留其描述、封面和项目；缺少的部分来自“{name}”。', 'confirm': '合并', 'done': '已将“{from}”合并到“{name}”。', 'undo': '撤销', 'undone': '“{from}”已重新分开。', 'noOther': '没有其他可合并的相册。'}}})
# 1.27.0: album cards with less on them
_merge(MESSAGES, {'albums': {'more': '更多操作', 'editMenu': '编辑名称和描述…', 'exportMenu': '导出照片…', 'sizeTitle': '磁盘上 {size}'}})
# 1.28.0: timeline, album mosaic, duplicate
_merge(MESSAGES, {'photos': {'timeline': '时间线', 'mosaicOn': '以拼贴方式显示', 'mosaicOff': '以网格显示', 'duplicate': '复制一份'}, 'ops': {'duplicate': {'done': '已创建 {count} 个副本。', 'undone': '已将 {count} 个副本移到回收站。'}}, 'main': {'duplicate': {'suffix': '副本', 'title': '复制 {count} 项', 'message': '在同一文件夹中创建副本（共 {size}），并带上原件的调整、裁剪、标记、描述和相册。原件不会改变。', 'sidecars': '随照片的 {count} 个 .xmp 或 .dop 文件也会以相同的新名称复制。', 'note': '可以撤销：副本会移到回收站。', 'skipped': '{count} 项在磁盘上找不到，将被排除。', 'confirm': '复制', 'nothing': '没有可复制的内容：找不到文件。', 'summary': '复制了 {count} 项', 'undoTitle': '将 {count} 个副本移到回收站？', 'undoMessage': '用“复制一份”创建的副本会移到回收站；原件保持不变。', 'undoNothing': '副本已更改或不存在：没有可撤销的内容。'}}})
# 1.28.1: change an album's cover
_merge(MESSAGES, {'albums': {'cover': {'menu': '更换封面…', 'title': '“{name}”的封面', 'lead': '从 {count} 张照片中选择相册封面（双击即可使用）。', 'none': '此相册没有带缩略图的照片可用作封面。', 'auto': '第一张照片', 'autoTitle': '封面恢复为相册的第一张照片', 'done': '已更换“{name}”的封面。'}}})
# 1.28.1: find an album by name
_merge(MESSAGES, {'albums': {'searchPlaceholder': '按名称查找相册', 'searchNone': '没有这个名称的相册，可以在下方新建。'}})
# 1.29.0: places from the photos
_merge(MESSAGES, {'places': {'fromPhotos': '来自照片', 'fromPhotosHint': '从每张照片读取：在 LionPhotos 或文件中写入的地点（城市、州省、国家），否则使用其 GPS 位置（在本机处理）。要更改，请更改照片的地点（描述 › 地点）。', 'yours': '你创建的', 'noCountry': '国家未知', 'fromPhoto': '来自照片', 'fromPhotoTitle': '从照片的地点或 GPS 读取：更改照片即可更改', 'howTo': '地点会根据照片的 GPS 和地点（城市、国家）自动出现。你也可以在上方创建一个，并对文件夹或所选照片使用“标签…”。'}})
# 1.30.0: the catalog kept with the collection
_merge(MESSAGES, {'portable': {'title': '随收藏保存的目录', 'lead': '相册、项目、人物和面孔、地点、类别、标记、描述、调整和裁剪也会保存在收藏的隐藏文件夹“.lionphotos”中：在另一台电脑上——或以另一个盘符连接这块硬盘——打开收藏时，一切都在。', 'switch': '保存在收藏中', 'switchTitle': '关闭：目录只保存在这台电脑上', 'off': '只保存在这台电脑上。', 'saved': '收藏文件夹中的目录已是最新（{when}，{size}）。', 'read': '已从收藏文件夹读取：{when} 由“{by}”写入。', 'readOnly': '无法写入收藏文件夹（只读）：目录保留在这台电脑上。', 'full': '磁盘已满：无法写入目录。', 'newer': '此收藏的目录由更新版本的 LionPhotos 写入：请更新 LionPhotos 后再读取。未覆盖任何内容。', 'error': '无法将目录写入收藏：{error}', 'pending': '有更改等待写入…', 'pendingShort': '有更改等待', 'waiting': '下次更改后写入文件夹。', 'saveNow': '立即保存', 'reveal': '显示文件夹', 'imported': '已从此收藏的文件夹读取目录（{when} 由“{by}”写入）。', 'importedKept': '已从此收藏的文件夹读取目录（{when} 由“{by}”写入）。这台电脑尚未写入的更改已保存在 .lionphotos/conflicts。'}})
# 1.31.0: the places on a world map
_merge(MESSAGES, {'places': {'map': {'open': '在地图上查看', 'openTitle': '在世界地图上打开这些地点', 'countries': '{count} 个国家', 'mode': '地图', 'label': '照片地点的世界地图', 'zoomIn': '放大', 'zoomOut': '缩小', 'fit': '显示所有地点', 'credit': '国界：Natural Earth · 城市：GeoNames · 在本机绘制', 'group': '{count} 个地点 · {items}', 'more': '还有 {count} 个', 'shown': '地图上有 {count} 个地点。', 'none': '还没有带位置的地点：地点来自照片的 GPS 和地点信息。', 'unplaced': '{count} 个位置未知。', 'manual': '你创建的 {count} 个地点没有位置，不会显示在地图上。'}}})

# 1.32.0: highlights — the photos marked great or OK
_merge(MESSAGES, {'showcase': {'mode': '精选', 'open': '查看精选照片', 'openTitle': '打开 {name} 中标为星标或 OK 的照片', 'of': '共 {count}', 'prev': '上一张精选照片', 'next': '下一张精选照片', 'empty': '还没有精选', 'howTo': '把最好的照片标为星标（1）或 OK（2）：它们所在的相册、人物、宠物和项目会出现在这里，并附上各自的精选照片。', 'lead': '{count} 个含有星标或 OK 照片的项目，最新的在前。'}, 'marks': {'picks': '星标和 OK'}})
_merge(MESSAGES, {'showcase': {'alsoIn': '也在'}})

# 1.34.0: highlights inside a label
_merge(MESSAGES, {'photos': {'spotOn': '精选：只显示星标或 OK 的照片，大图', 'spotOff': '返回全部照片'}, 'showcase': {'photoEmpty': '这里没有星标或 OK 的照片', 'photoHowTo': '把最好的照片标为星标（1）或 OK（2），它们会在这里以大图依次显示。', 'photoOpen': '打开', 'photoLead': '{count} 张星标或 OK 的照片。'}})

# 1.35.0: raw development (16 bits)
_merge(MESSAGES, {'adjust': {'raw': {'noteOff': 'RAW 照片：调整作用于相机存放在文件中的 JPEG（8 位），而不是 RAW 数据。原始文件始终不变。', 'noteOn': 'RAW 显影：调整作用于传感器数据，在本机以 16 位显影。原始文件始终不变。', 'switch': '基于 16 位 RAW 数据编辑（显影模式）', 'hint': '以相机白平衡为起点，有更大余地找回高光和阴影。显影后的照片打开约需一秒，导出需几秒。', 'noGpu': '需要显卡（WebGL 2），此处不可用。', 'developing': '正在显影 RAW…', 'failed': '无法显影 RAW：{error}'}}, 'viewer': {'rawDeveloped': '16 位显影', 'rawDevelopedTitle': '由传感器数据绘制，在本机以 16 位显影（LibRaw）。前后对比（Y）与相机 JPEG 比较。'}})

# 1.36.0: the search of the title bar
_merge(MESSAGES, {'gs': {'placeholder': '在 {folder} 中搜索——照片、摄影师、地点、相册…', 'label': '搜索整个收藏（Ctrl+K）', 'hint': '按文件名、摄影师、相机、地点、相册、项目、人物、宠物、关键词或描述搜索。', 'keys': '↑ ↓ 选择 · Enter 打开 · Esc 关闭', 'openFolder': '打开其他文件夹', 'noPhotos': '没有包含“{q}”的照片', 'empty': '没有照片', 'allPhotos': '在“照片”中查看包含“{q}”的全部 {count} 张照片', 'group': {'photos': '照片', 'album': '相册', 'project': '项目', 'person': '人物', 'pet': '宠物', 'place': '地点', 'authors': '摄影师', 'cameras': '相机', 'keywords': '关键词', 'folders': '文件夹'}}})

# 1.36.0: why nothing is shown
_merge(MESSAGES, {'photos': {'why': {'query': '正在使用搜索“{q}”', 'year': '只显示 {year} 年', 'videos': '只显示视频', 'images': '只显示照片', 'mark': '只显示标记“{mark}”', 'category': '只显示类别“{name}”', 'sphere': '只显示“{name}”（标题栏）', 'noAlbum': '只显示不在相册中的照片', 'thisFolder': '只显示此文件夹，不含子文件夹', 'titleIn': '“{name}”中没有符合筛选条件的项目', 'hiddenIn': '它有 {count} 项：被下面的筛选条件隐藏了。', 'hidden': '这里有 {count} 项：被下面的筛选条件隐藏了。', 'without': '去掉后：{count} 项', 'remove': '去掉', 'removeAll': '去掉所有筛选'}}})

# 1.36.0: albums in an even grid
_merge(MESSAGES, {'albums': {'modeMosaic': '拼贴', 'modeEven': '均匀网格'}})
_merge(MESSAGES, {'photos': {'clearSearch': '清除搜索'}})
# 1.37.0: lens correction (Lensfun profiles)
_merge(MESSAGES, {'adjust': {'group': {'lens': '镜头'}, 'lensDist': '畸变', 'lensVig': '暗角', 'lensCa': '色差'}, 'lens': {'summary': '已校正镜头', 'switch': '校正镜头', 'choose': '选择配置文件…', 'hint': '根据镜头配置文件 (Lensfun) 消除畸变、暗角和色差。文件本身不会改变。', 'hintOn': '滑块：0 为实测配置，+ 更强，− 更弱。没有配置文件时手动校正：+ 拉直桶形畸变并提亮四角。', 'noGpu': '需要显卡 (WebGL)，此处不可用。', 'failed': '无法校正镜头：{error}', 'sensor': '传感器 {crop}×', 'noProfileFor': '没有“{lens}”的配置文件：请用滑块校正，或选择一个配置文件。', 'noProfile': '照片未记录镜头：请用滑块校正，或选择一个配置文件。', 'manyProfiles': '{total} 张照片中 {count} 张有配置文件', 'distortion': '畸变', 'vignetting': '暗角', 'fringes': '色差', 'searchPlaceholder': '按名称、厂商或卡口搜索（如 RF 16、Sigma 150-600、Nikon Z）', 'search': '搜索镜头配置文件', 'profiles': '镜头配置文件', 'none': '无 — 手动校正', 'noneDetail': '由滑块进行校正', 'fits': '相同焦距', 'more': '{count} 个中的前 {shown} 个：继续输入以缩小范围', 'use': '使用此配置文件', 'correction': '镜头校正', 'pickTitle': '选择镜头配置文件', 'cameraSays': '相机记录：{lens}', 'credit': '来自 Lensfun (lensfun.github.io) 的 {count} 个镜头配置文件，CC BY-SA 3.0。', 'found': '{count} 个配置文件', 'forMany': '{count} 张照片'}})
# 1.37.0: lens corrections by hand
_merge(MESSAGES, {'adjust': {'manDist': '畸变', 'manVert': '垂直', 'manHorz': '水平', 'manScale': '缩放', 'manVig': '四角', 'manMid': '中点', 'manCaR': '红/青', 'manCaB': '蓝/黄', 'lensDist': '配置文件畸变', 'lensVig': '配置文件暗角', 'lensCa': '配置文件色差'}, 'lens': {'switch': '按镜头配置文件校正', 'hintOn': '配置文件滑块：0 为实测，+ 更强，− 更弱。', 'manual': '校正', 'manualReset': '重置', 'manualHint': '有无配置文件都可使用。+ 拉直桶形畸变、展开上方或右侧、提亮四角。双击滑块恢复为 0。', 'geometry': '几何', 'corners': '四角', 'fringesTitle': '色差', 'noProfileFor': '没有“{lens}”的配置文件：请在下方手动校正，或选择一个配置文件。', 'noProfile': '照片未记录镜头：请在下方手动校正，或选择一个配置文件。'}})
_merge(MESSAGES, {'adjust': {'manVig': '数量'}})
# 1.37.0: .xmp alongside JPEG too
_merge(MESSAGES, {'main': {'meta': {'write': {'both': '图像内部，以及旁边的 {name}', 'noteInside': 'JPEG：元数据写入文件内部，照片发送时随之携带（图像本身不变，旧版本移至回收站），同时也写入旁边的 .xmp 文件。'}}}})
# recovery copy (1.37.1)
_merge(MESSAGES, {'describe': {'safeCollection': '输入即保存：保存在目录中，并在收藏文件夹 (.lionphotos) 中自动写入恢复副本。只有在你要求写入时，照片文件才会改变。', 'safeLocal': '输入即保存，保存在本机目录中。只有在你要求写入时，照片文件才会改变。', 'safeWhen': '恢复副本写入于 {when}', 'notInFile': '尚未写入文件的字段：{count} 个', 'inFile': '文件中已有这些数据。', 'writeHint': '将这些元数据和标记（作为评级）写入文件，供其他程序和发送使用：JPEG 写入内部和旁边的 .xmp；其他格式写入旁边的 .xmp'}, 'main': {'meta': {'write': {'message': '到目前为止，这些更改只在目录（及其恢复副本）中。现在元数据（作者、说明、音频描述、地点、关键词……）和标记（作为评级）将写入文件本身，供其他程序和发送使用。'}}}})
# 1.38.0: Watermelon and City blue
_merge(MESSAGES, {'statusbar': {'themeTeal': '西瓜', 'themeTealTitle': '西瓜主题——标志的青色、粉色和白色', 'themeCity': '城市蓝', 'themeCityTitle': '城市蓝主题——钴蓝、珊瑚色和白色，如同城市规划图'}})

# 1.39.0: new versions, only when asked (the version in the bottom-right corner)
_merge(MESSAGES, {'update': {'status': {'title': 'LionPhotos 版本 — 点击检查新版本', 'checking': '正在检查新版本…', 'currentTitle': '你使用的是最新版本。点击查看详情。', 'errorTitle': '无法检查新版本。点击重试。', 'available': '新版本 {version}', 'availableTitle': '{version} 版本已发布。点击更新。'}, 'dialog': {'installed': '已安装版本', 'newVersion': '新版本', 'availableTitle': '有新版本可用', 'howInstaller': 'LionPhotos 将关闭，安装程序会下载、校验并安装新版本，然后重新打开。你的设置和目录会被保留。', 'howScript': 'LionPhotos 将关闭，安装程序（PowerShell）会下载、校验并安装新版本。你的设置和目录会被保留。', 'howDownload': '新版本的下载页面将在浏览器中打开。请下载适用于你系统的安装程序并打开它。你的设置和目录会被保留。', 'question': '现在更新吗？', 'whatsNew': '查看此版本的新功能', 'updateNow': '立即更新', 'openDownload': '打开下载页面', 'notNow': '暂不', 'checking': '正在检查新版本…', 'currentTitle': 'LionPhotos 已是最新版本', 'currentText': '你使用的是最新版本。', 'errorTitle': '无法检查更新', 'errorText': '请检查网络连接后重试。', 'checkAgain': '重新检查', 'closing': '正在关闭 LionPhotos 以进行更新…', 'howDmg': '新版本（.dmg）将下载到“下载”文件夹，经校验后打开，LionPhotos 将关闭。请将 LionPhotos 拖到“应用程序”并选择“替换”。你的设置和目录会被保留。', 'howSh': 'LionPhotos 将关闭，安装程序（install.sh）会下载、校验并安装新版本，然后重新打开。你的设置和目录会被保留。', 'howAppImage': '新的 AppImage 将被下载并校验，替换当前文件后打开。你的设置和目录会被保留。', 'howDeb': '新的软件包（.deb）将下载到“下载”文件夹，经校验后在系统的软件安装程序中打开，安装时会要求输入密码。完成后请重新打开 LionPhotos。你的设置和目录会被保留。', 'howRpm': '新的软件包（.rpm）将下载到“下载”文件夹，经校验后在系统的软件安装程序中打开，安装时会要求输入密码。完成后请重新打开 LionPhotos。你的设置和目录会被保留。', 'downloading': '正在下载并校验新版本…', 'progress': '{name}：{done} / {total}', 'progressNoTotal': '{name}：{done}', 'preparing': '正在获取新版本的文件…', 'closingDmg': '正在关闭 LionPhotos：请在打开的窗口中将其拖到“应用程序”并选择“替换”。', 'privacy': '只有在你打开此窗口时，LionPhotos 才会连接互联网：它会读取 GitHub 上已发布版本中的一个小文件。更新时会下载适用于你系统的安装程序，并在使用前进行校验（SHA-256）。不会发送任何关于你或你照片的数据。'}, 'failed': '无法开始更新：{error}', 'downloadOpened': '已在浏览器中打开下载页面。', 'packageOpened': '新版本已在系统安装程序中打开。安装完成后请重新打开 LionPhotos。', 'saved': '新版本位于 {file}：打开它即可安装。', 'error': {'checksum': '下载的文件与公布的校验和不符，已被丢弃', 'network': '无法连接 GitHub — 请检查网络连接'}}})

# 1.40.0: the panel by task (tabs, two panels in a wide viewer)
_merge(MESSAGES, {'panel': {'tab': {'adjust': '调整', 'describe': '描述', 'info': '信息'}, 'tabs': '面板显示的内容', 'describeInfo': '描述和信息', 'oneTitle': '单个面板（调整、描述和信息分为标签页）', 'twoTitle': '两个面板：左侧为描述和信息，右侧为调整', 'resize': '拖动以调整面板宽度（双击：恢复默认宽度）'}, 'describe': {'safeShort': '已保存到目录'}})

_merge(MESSAGES, {'viewer': {'editTitle': '显示或收起编辑面板：类别、相册、调整、描述、作者和地点（H）'}})

# 1.40.1: all the photos of the day
_merge(MESSAGES, {'info': {'dayAll': '查看当天的所有照片', 'dayTitle': '离开此处，在“照片”中显示 {day} 的所有照片和视频'}, 'photos': {'clearDay': '显示所有日期', 'why': {'day': '仅 {day} 的照片'}}})

_merge(MESSAGES, {'info': {'dayAll': '当天的照片'}})

# 1.41.0
_merge(MESSAGES, {'intro': {'help': '此页面的用途', 'gotIt': '知道了'}})

_merge(MESSAGES, {'adjust': {'holdOriginal': '按住查看原图'}, 'labels': {'emptyFind': {'person': '让 LionPhotos 在本机查找照片中的人物。', 'pet': '让 LionPhotos 在本机查找照片中的宠物。'}, 'emptyOr': '也可以在上方的输入框中手动创建。'}})

_merge(MESSAGES, {'reorganize': {'reasons': {'backup': '副本：名称表明如此（{count} 张中有 {twins} 张也在其他位置）— 保持不动', 'copies': '副本：{count} 张中有 {twins} 张也在其他文件夹中 — 保持不动'}, 'seeDuplicates': '查看重复文件'}})

_merge(MESSAGES, {'keys': {'title': '键盘快捷键', 'search': '搜索整个收藏', 'open': '打开文件夹', 'refresh': '查找新增和更改的文件', 'views': '照片 · 相册 · 待定区', 'sidebar': '侧边栏 · 仅显示照片', 'undo': '撤销 · 重做', 'back': '从相册返回 · 整个收藏', 'this': '此列表', 'marks': '很棒 · 可以 · 待删除 · 清除标记', 'select': '打开 · 全选 · 取消选择', 'files': '重命名 · 复制 · 导出', 'compare': '并排比较', 'tabs': '调整 · 描述 · 信息（再按一次：收起）', 'hide': '显示或隐藏面板', 'nav': '上一张 · 下一张 · 第一张 · 最后一张', 'zoom': '适应 ↔ 实际大小 · 放大 · 缩小', 'edit': '裁剪 · 前后对比 · 按住查看原图', 'show': '幻灯片 · 全屏 · 添加到相册', 'viewerMore': '与下一张比较 · 导出', 'limbo': '移到待定区', 'close': '关闭', 'button': '键盘快捷键 (?)', 'group': {'everywhere': '任何界面', 'photos': '照片', 'panel': '侧面板', 'viewer': '查看器'}}, 'compare': {'title': '并排比较', 'hint': '← → 更换标记一侧的照片 · Tab 切换一侧 · 1 2 3 标记 · 滚轮同时缩放两张', 'left': '左侧照片', 'right': '右侧照片', 'prev': '上一张', 'next': '下一张', 'menu': '并排比较', 'viewerTitle': '与下一张照片比较'}})

_merge(MESSAGES, {'export': {'more': '更多选项', 'less': '收起选项'}})

_merge(MESSAGES, {'backup': {'catalog': {'current': '目录（相册、人物、标记、描述、调整）也已在备份中，日期为 {when}。', 'older': '备份中的目录副本较旧（{when}）：之后创建的相册、人物和调整不在其中。', 'missing': '备份中没有目录副本：只有照片，没有相册、人物、描述和调整。', 'copy': '将目录复制到备份', 'copied': '目录已复制到备份。'}}, 'portable': {'locked': '已在 {by} 上打开（自 {when} 起）：在那里关闭之前，这里不会向收藏文件夹写入任何内容。你在这里所做的会保存在本机目录中，之后再写入文件夹。', 'takeOver': '仍在此处使用', 'takeOverTitle': '从本机写入收藏文件夹。仅当另一台电脑上确实没有打开 LionPhotos 时使用。', 'lockedToast': '此收藏已在另一台电脑（{by}）上打开。在那里关闭之前，你在这里所做的会保存在本机目录中。'}})

_merge(MESSAGES, {'albums': {'setAsCover': '设为相册封面'}})

_merge(MESSAGES, {'about': {'short': '关于'}})

_merge(MESSAGES, {'sidebar': {'hide': '隐藏导航 ({key})', 'show': '显示导航 ({key})'}})

_merge(MESSAGES, {'plugins': {'which': {'label': '要导出的照片', 'all': '全部', 'good': '优秀和 OK', 'great': '仅优秀'}, 'view': {'ofTotal': '{total} 中的 {n}', 'noneWhich': '没有带此标记的照片', 'preview': '预览', 'previewTitle': '查看将要导出的照片', 'open': '打开', 'openTitle': '在“照片”中打开“{name}”，以查看和修改。返回会回到此页面。'}, 'preview': {'count': '导出：{total} 中的 {n}', 'more': '另有 {n}', 'cover': '封面'}}})

_merge(MESSAGES, {'plugins': {'same': {'title': {'one': '{count} 组同名照片', 'other': '{count} 组同名照片'}, 'text': '在页面上它们会是同一个名称下的两张照片。请为每组选择要导出的那一张；另一张不参与本次导出。', 'raw': 'RAW：转换为 JPG 导出', 'continue': '继续'}}})

_merge(MESSAGES, {'places': {'sphereEmpty': '“{sphere}”中没有带地点的文件。', 'sphereTable': '各类别中的地点', 'sphereFiles': {'one': '{count} 个带地点的文件', 'other': '{count} 个带地点的文件'}, 'spherePlaces': {'one': '{count} 个地点', 'other': '{count} 个地点'}, 'sphereShow': '查看', 'sphereHere': '当前打开'}})

_merge(MESSAGES, {'sidebar': {'otherFolders': '之前打开过的其他文件夹'}, 'showcase': {'albumsNoPicks': '这些相册中还没有带星标或 OK 的照片，所以没有精选：相册按马赛克方式显示。给最好的照片做标记（1 或 2），即可在这里看到。'}})

_merge(MESSAGES, {'showcase': {'modeTitle': '精选：只显示有星标或 OK 照片的项目', 'only': '精选只显示有星标或 OK 照片的项目：{total} 个中的 {shown} 个，最新的在前。', 'all': '显示全部', 'albumsNoPicks': '这些相册中还没有带星标或 OK 的照片。精选只显示有星标或 OK 照片的相册，所以目前按马赛克方式显示。给最好的照片做标记（1 或 2），即可在这里看到。'}})

_merge(MESSAGES, {'statusbar': {'eta': {'estimating': '正在估算时间…', 'lessMinute': '剩余不到 1 分钟', 'minutes': {'one': '剩余约 1 分钟', 'other': '剩余约 {count} 分钟'}, 'hours': {'one': '剩余约 1 小时', 'other': '剩余约 {count} 小时'}, 'hoursMinutes': '剩余约 {hours} 小时 {minutes} 分钟'}}})

_merge(MESSAGES, {'statusbar': {'thumbsKept': '缩略图保存在目录中，不会重新生成：{kept} 个已就绪，只生成缺少的 {missing} 个。'}})

_merge(MESSAGES, {'dupes': {'etaStep': '此步骤{eta}'}})

_merge(MESSAGES, {'trashlog': {'byRoot': '按根文件夹', 'byRootHint': '每个硬盘或文件夹送出的量，以及全部合计。点击其中一个，下方只显示它。', 'rootAll': '所有根文件夹', 'rootUnknown': '未记录的根文件夹', 'col': {'root': '根文件夹', 'sent': '送入回收站', 'limbo': '待定区释放', 'dups': '重复文件'}}})

_merge(MESSAGES, {'overview': {'cache': 'LionPhotos 占用的空间', 'cacheHint': '缩略图和预览只生成一次并保存在目录中；只有文件变化时才重新生成。不包括照片本身。', 'space': {'thumbsTotal': '缩略图和预览', 'fileTotal': '此电脑上的目录文件', 'photoThumbs': '照片缩略图', 'videoThumbs': '视频缩略图', 'adjusted': '已调整照片的缩略图', 'byRoot': '按根文件夹', 'rootTotal': '合计', 'portable': '.lionphotos', 'portableTitle': '与照片一起保存的目录，位于每个根文件夹的隐藏文件夹 .lionphotos 中（硬盘未连接时为 —）'}}, 'settings': {'space': '占用空间', 'spaceLoading': '正在计算…', 'spaceLine': '缩略图和预览：{thumbs} · 目录文件：{file}', 'spaceDetails': '详情'}})

_merge(MESSAGES, {'places': {'noCity': {'one': '{count} 项没有城市', 'other': '{count} 项没有城市'}, 'noCityTitle': '只写明国家、没有城市的照片（GPS 离离线列表中的城市较远，或文件中只有国家）。按钮会显示该国家的所有照片。'}})

_merge(MESSAGES, {'dupes': {'showAll': '显示所有副本'}})

_merge(MESSAGES, {'albumSuggest': {'scanning': {'one': '文件夹仍在读取：这些建议来自目前已读取的 {count} 个文件。读取完成后再次建议即可使用全部文件。', 'other': '文件夹仍在读取：这些建议来自目前已读取的 {count} 个文件（以及此电脑已了解的信息）。读取完成后再次建议即可使用全部文件。'}}})

_merge(MESSAGES, {'views': {'todo': '待编辑'}, 'keys': {'todo': '待编辑'}, 'todo': {'lead': '封面上标了铅笔的相册和项目，按要做的先后排列：最上面的先做。拖动（或用箭头）改变顺序；“完成”会取下铅笔。只更改目录。', 'listLabel': '待编辑（按顺序）', 'count': {'one': '{count} 个待编辑', 'other': '{count} 个待编辑'}, 'keys': '拖动可重新排序 · 在某行按 Alt+↑ ↓ 移动', 'empty': '没有待编辑的内容', 'howTo': '点击相册或项目封面上的铅笔（或 ⋯ 菜单中的“标记为待编辑”）即可放到这里。然后把最先要做的放在最前面。', 'rowLabel': '第 {n} 个，共 {total} 个：{type} {name}', 'toTop': '移到最上', 'up': '上移', 'down': '下移', 'toBottom': '移到最下', 'done': '完成', 'doneTitle': '完成：取下铅笔（离开此列表）', 'dragTitle': '拖动以改变顺序', 'moved': '{name} 现在是第 {n} 个', 'due': '截止 {date}', 'dueLate': '自 {date} 起逾期', 'added': '“{name}”已加入待编辑，第 {n} 个。', 'see': '查看列表', 'removed': '“{name}”已移出待编辑。', 'undo': '撤销', 'pinTitle': '标记为待编辑（铅笔）', 'pinOnTitle': '待编辑 — 列表第 {n} 个。点击取下铅笔', 'menuOn': '标记为待编辑', 'menuOff': '移出待编辑'}})

_merge(MESSAGES, {'brand': {'title': '名称和标志', 'lead': '在标题栏和欢迎页显示你自己的名称和标志——机构、工作室或课程的。保存在这台电脑上。', 'preview': '标题栏预览', 'name': '名称', 'logo': '标志', 'logoPreview': '标志', 'logoPick': '选择图片…', 'logoDefault': '使用 LionPhotos 的标志', 'logoHint': 'PNG、JPG、WebP 或 SVG。会完整放入一个正方形，周围透明。', 'poweredNote': '使用自己的名称时，标题栏和窗口标题中会在旁边显示“Powered by LionPhotos”。“关于”中保留 LionPhotos 的署名。', 'defaultNote': '名称留空（或填 LionPhotos）即保持 LionPhotos；也可以只更换标志。', 'save': '保存', 'reset': '恢复为 LionPhotos', 'change': '更改…', 'saved': '现在显示为“{name}”。', 'restored': '已恢复 LionPhotos 的名称和标志。', 'badFile': '此文件不是可用作标志的图片（PNG、JPG、WebP、GIF 或 SVG，最大 15 MB）。'}})

_merge(MESSAGES, {'update': {'dialog': {'howSetup': '将下载并校验新版本的安装程序（约 150 MB，完整应用）。随后 LionPhotos 关闭，安装程序安装新版本并重新打开。你的设置和目录会保留。'}}})

_merge(MESSAGES, {'similar': {'link': '相似照片', 'linkTitle': '将这一天的相似照片分组，每组连拍只保留最好的一张', 'menu': '这一天的相似照片', 'title': '相似照片 · {day}', 'levelLabel': '相似程度', 'prevDay': '前一天', 'nextDay': '后一天', 'level': {'same': '几乎相同', 'sameTitle': '只包括几乎一样的照片', 'similar': '相似', 'similarTitle': '同一张照片的不同版本（推荐）', 'scene': '同一场景', 'sceneTitle': '同一时刻，也包括从其他角度拍的'}, 'reading': '正在比较这一天的照片…', 'progress': '缩略图 {done} / {total}', 'photos': {'one': '{count} 张照片', 'other': '{count} 张照片'}, 'groups': {'one': '{count} 组', 'other': '{count} 组'}, 'noThumb': {'one': '{count} 张还没有缩略图', 'other': '{count} 张还没有缩略图'}, 'send': {'one': '将 {count} 张送入待删区', 'other': '将 {count} 张送入待删区'}, 'sendNone': '没有要送出的照片', 'footNote': '保留 {keep} · 送入待删区 {go}', 'withTwins': {'one': '（另加同一张照片的 RAW 或 JPG {count} 个）', 'other': '（另加同一张照片的 RAW 或 JPG {count} 个）'}, 'none': '这一天没有相似的照片', 'noneTry': '试试“同一场景”，可将同一时刻从其他角度拍的照片也分到一组。', 'noneScene': '这一天的照片彼此差别都很大。', 'tryScene': '试试“同一场景”', 'lead': '每组中的照片实际上是同一张图。建议保留的一张带有边框，其余的将送入待删区。点击照片可切换保留或送出；双击可比较。', 'groupLabel': '第 {n} 组，{count} 张照片', 'group': '第 {n} 组', 'keeps': {'one': '保留 {count} 张', 'other': '保留 {count} 张'}, 'compareTitle': '并排比较这些照片', 'compare': '比较', 'keepAll': '全部保留', 'keepBest': '只保留建议的', 'tileOut': '送入待删区', 'tileKeep': '保留', 'tileHint': '单击切换，双击比较', 'bestTitle': '建议：最清晰、曝光最好的一张（或你标记的那张）', 'best': '最佳', 'confirmTitle': {'one': '将 {count} 张相似照片送入待删区？', 'other': '将 {count} 张相似照片送入待删区？'}, 'confirmMessage': '它们会离开“照片”，在待删区等待，可以随时恢复。不会删除任何文件。', 'sent': {'one': '已将 {count} 张相似照片送入待删区。', 'other': '已将 {count} 张相似照片送入待删区。'}, 'undo': '撤销'}, 'limbo': {'twins': {'one': '同时送出同一张照片的 RAW 或 JPG（{count} 个文件）', 'other': '同时送出同一张照片的 RAW 或 JPG（{count} 个文件）'}}})

_merge(MESSAGES, {'statusbar': {'slowSource': '此文件夹读取较慢（Google 云端硬盘之类的云盘？）：制作缩略图时会提前取回后面的文件。在云盘应用中将该文件夹设为“可离线使用”会快很多。'}})

_merge(MESSAGES, {'gs': {'group': {'content': '照片里有什么'}, 'content': {'analyse': '按照片内容搜索', 'analyseSub': '在这台电脑上于后台逐张读取照片（进度显示在“相册 › 建议”中）', 'started': '正在读取照片：读取完成的照片即可按内容搜索。', 'unsupported': '读取照片内容需要显卡（WebGL），此处不可用。'}}, 'content': {'shows': '内容', 'searchTitle': '在“照片”中搜索“{name}”'}})

_merge(MESSAGES, {'source': {'local': '在本机磁盘上', 'external': '在外置磁盘上（USB、存储卡）', 'cloud': '在云盘上', 'cloudNamed': '在云端：{service}', 'network': '在网络上', 'externalShort': '外置', 'networkShort': '网络', 'cloudShort': '云端'}})

_merge(MESSAGES, {'brand': {'pluginNote': '已启用的插件“{plugin}”为应用设置了名称和标志：此处字段为空时使用它们；你填写的自己的名称和标志优先。', 'usePlugin': '使用插件的'}, 'plugins': {'givesBrand': '启用时将应用名称设为“{name}”并设置标志。', 'givesLogo': '启用时设置应用标志。'}})

_merge(MESSAGES, {'dupes': {'compare': '并排比较', 'compareTitle': '保留的副本在左，另一个在右，确认两者相同', 'compareExternal': '在电脑的程序中各开一个窗口，以便并排查看', 'open': '在 LionPhotos 中打开', 'keeping': '保留此副本', 'keepThis': '保留此副本（其他移到回收站）'}})

_merge(MESSAGES, {'similar': {'titleShown': '在显示的照片中找相似照片', 'shownTitle': '将显示的照片（此文件夹、年份或相册，含筛选）中实际上相同的照片分组，以便选择保留哪些', 'fewShown': '请至少显示两张照片再查找相似照片。', 'more': {'other': '显示更多（还剩 {count} 组）'}}})

_merge(MESSAGES, {'similar': {'button': '相似照片', 'more': {'one': '显示更多（还剩 {count} 组）', 'other': '显示更多（还剩 {count} 组）'}}})

_merge(MESSAGES, {'sidebar': {'forget': '从此列表中移除（相册和标记仍会保留）', 'forgotten': '已将 {folder} 从之前打开的文件夹列表中移除。目录仍保留：再次打开，一切都在。', 'forgetUndone': '{folder} 已回到列表。'}})

_merge(MESSAGES, {'compare': {'onLeft': '左', 'onRight': '右', 'strip': '正在比较的照片', 'stripHint': '点击以在标记的一侧显示', 'count': {'one': '{count} 张照片', 'other': '{count} 张照片中每次显示 2 张'}}})

_merge(MESSAGES, {'similar': {'count': {'one': '{count} 张照片', 'other': '{count} 张照片'}, 'countTitle': '此组的照片数量', 'notOne': '不属于同一组', 'notOneTitle': '这些照片不属于同一组（例如构图相似但人物不同）：之后不会再归为一组', 'photoMenu': '此照片的更多操作', 'setBest': '设为最佳', 'keepOnly': {'one': '只保留这张：另一张移到待删区', 'other': '只保留这张：其余 {count} 张移到待删区'}, 'takeOut': '移出此组', 'compareThis': '并排比较', 'takenOut': '{name} 已移出此组，之后不会再与这些照片归为一组。', 'notOneDone': {'one': '这张照片已不在任何组中。', 'other': '这 {count} 张照片已不再是一组，之后不会再归为一组。'}}})

_merge(MESSAGES, {'similar': {'whoUnknownTitle': '尚未在这张照片中查找人物：正在查找', 'whoUnknown': '正在查找人物…', 'whoNone': '没有人物', 'faceNamed': '{name} — 点击更改', 'faceName': {'person': '这是谁？', 'pet': '这是哪只宠物？'}, 'eyebrowPerson': '人物', 'eyebrowPet': '宠物', 'faceLabel': '名字', 'faceSave': '保存', 'faceSaved': '已保存 {name}：这张脸现在在“人物”中。', 'stack': '将相似照片分组', 'stackTitle': '将每组相似照片显示为一张（最佳的那张），并显示张数（点击数字打开该组）', 'stackReading': '正在读取照片以进行分组', 'stackOpen': {'one': '{count} 张相似照片的组', 'other': '{count} 张相似照片的组'}, 'stackBadge': {'one': '{count} 张相似照片：打开该组', 'other': '{count} 张相似照片：打开该组'}}, 'compare': {'more': '此照片的更多操作', 'keepTitle': '保留，或移到待删区（空格键）', 'stays': '保留', 'goes': '移到待删区', 'hintKeep': '空格：保留或移走 · ← → 组内其他照片 · Tab 切换左右 · 滚轮同时缩放'}, 'carry': {'labels': '相册和人物', 'mark': '标记', 'stays': '保留', 'field': '字段', 'inKept': '保留的照片', 'inGoing': '移走的照片', 'empty': '空', 'from': '来自 {name}', 'apply': '带上并继续', 'skip': '不带上，继续', 'title': {'one': '移走的照片有 {count} 项保留的照片没有的信息', 'other': '移走的照片有 {count} 项保留的照片没有的信息'}, 'message': '勾选要带到保留照片上的内容（写入目录，可撤销）。已预先勾选更完整或更新的内容。'}})

_merge(MESSAGES, {'similar': {'statusReading': '正在读取照片以分组：{done} / {total}', 'statusFaces': '正在查找人脸：{done} / {total} 张 — 人物不同的组会分开', 'statusPaused': '已暂停', 'statusDone': '{groups} · {photos} 张中有 {grouped} 张在组中（每组显示最佳的一张）', 'statusGroups': {'one': '{count} 组相似照片', 'other': '{count} 组相似照片'}, 'statusNone': '所显示的 {photos} 张照片中没有相似照片'}})

_merge(MESSAGES, {'similar': {'statusFromCatalog': {'one': '{count} 张照片的人脸来自目录（已分析）', 'other': '{count} 张照片的人脸来自目录（已分析）'}}})

_merge(MESSAGES, {'similar': {'only': '只看分组的', 'onlyTitle': '只显示相似照片组（每组显示最佳的一张），不显示单独的照片'}})

_merge(MESSAGES, {'photos': {'kind': {'grouped': '分组的照片'}}})

_merge(MESSAGES, {'viewer': {'stackLabel': {'one': '{count} 张相似照片', 'other': '{count} 张相似照片'}, 'stackOpen': '选择保留哪些', 'stackOpenTitle': '打开该组，选择保留哪些照片、哪些移到待删区'}})

_merge(MESSAGES, {'similar': {'why': {'menu': '为什么（没有）分组？', 'title': '这些照片为什么（没有）分在一组？', 'reading': '正在读取照片…', 'picture': '画面', 'unread': '未读取（还没有缩略图）', 'alike': '相似度 {pct}（{level} 要求 {need}）', 'time': '时间', 'apart': '相隔 {span}（最多 {max}）', 'people': '人物', 'others': '每张照片里是不同的人', 'notSeen': '尚未分析', 'same': '相同的人物（或没有人）', 'decision': '你的决定', 'said': '你指定它们不属于同一组', 'together': '在同一组中。', 'firstPhoto': '彼此足够相似：但它们本应加入的组是由一张不太相似的照片开始的（每张照片也须与组内第一张相似）。', 'wouldAt': '在 {levels} 级别下会分在一起。', 'never': '在任何级别下都不会分在一起。', 'useLevel': '按 {level} 分组', 'unsay': '属于同一组', 'stillReading': '照片仍在读取中：分组可能还会变化。', 'lead': '按拍摄顺序，每张照片与下一张并列，显示当前级别（{level}）下的判断。', 'seconds': '{n} 秒', 'minutes': '{m} 分 {s} 秒', 'hours': '{h} 小时 {m} 分'}}})

_merge(MESSAGES, {'similar': {'why': {'minutesOnly': '{m} 分', 'days': {'one': '{count} 天', 'other': '{count} 天'}}}})

_merge(MESSAGES, {'photos': {'rawsInGroup': {'one': '此组中有 {count} 个 RAW 文件', 'other': '此组中有 {count} 个 RAW 文件'}}})

_merge(MESSAGES, {'similar': {'sens': {'label': '照片需要多相似才会分组', 'title': '越靠近“相似”，分组的照片越多；越靠近“几乎相同”，只有几乎一样的照片', 'value': '相似度 {pct}%，最多相隔 {min} 分钟', 'same': '几乎相同', 'alike': '相似'}, 'why': {'alikeSens': '相似度 {pct}（当前灵敏度要求 {need}）', 'wouldFrom': '灵敏度为 {v} 或更高时会分在一起。', 'useSens': '使用灵敏度 {v}', 'leadSens': '按拍摄顺序，每张照片与下一张并列，显示当前灵敏度（{v}/100）下的判断。'}, 'removeFromGroup': '从分组中移除照片', 'removedFromGroup': '已将 {name} 移出分组，之后不会再与这些照片分在一起。'}})

_merge(MESSAGES, {'similar': {'makeSingle': '设为单独照片'}})

_merge(MESSAGES, {'labels': {'type': {'person': {'find': '查找或添加人物'}, 'pet': {'find': '查找或添加宠物'}, 'place': {'find': '查找或添加地点'}, 'album': {'find': '查找或添加相册'}}, 'findOrNew': '回车：新建“{name}”', 'findNone': '没有“{name}”— 回车新建'}})

_merge(MESSAGES, {'similar': {'why': {'content': '内容', 'contentUnread': '尚未由内容模型读取', 'contentAlike': '所拍内容相似度 {pct}（内容模型）'}}})

_merge(MESSAGES, {'similar': {'mode': {'label': '相似照片的显示方式', 'all': '全部', 'stacks': '分组', 'groups': '仅分组', 'allTitle': '所有照片，逐张显示', 'stacksTitle': '每组相似照片显示为一张（最佳的那张），并显示堆叠和张数', 'groupsTitle': '只显示相似照片组（不显示单独的照片）', 'groupsOff': '也显示单独的照片'}}})

_merge(MESSAGES, {'similar': {'pickAll': '全选', 'pickNoneBtn': '取消选择', 'pickedOf': '已选择 {n} / {total} 组', 'pickTitle': '已选择：此处的操作将应用于它', 'inPicked': '在所选组中：', 'pickNone': '请选择一个组'}})

_merge(MESSAGES, {'adjust': {'group': {'curves': '曲线'}}, 'curves': {'canvasLabel': '曲线：每种亮度会变成什么', 'channel': '通道', 'resetChannel': '将此曲线恢复为直线', 'hint': '点击曲线添加一个点并拖动；把点拖出方框或双击它即可删除。方向键可移动所选的点。', 'point': '输入 {x} → 输出 {y}', 'mixed': '所选照片的曲线不同：此处的设置将应用于全部照片。', 'ch': {'rgb': 'RGB', 'r': '红', 'g': '绿', 'b': '蓝', 'rgbTitle': '整个画面（亮度）', 'rTitle': '画面的红色', 'gTitle': '画面的绿色', 'bTitle': '画面的蓝色'}}})

_merge(MESSAGES, {'similar': {'groupSwitch': '照片分组', 'menuTitle': '相似程度、仅分组、检查相似照片以及为什么（没有）分组', 'review': '检查相似照片…', 'sens': {'heading': '灵敏度'}, 'why': {'pick': '选择 2 到 12 张照片，查看它们为什么（没有）分组。'}}})

_merge(MESSAGES, {'similar': {'groupSwitch': '堆叠照片', 'stackTitle': '将每个相似照片堆叠显示为一张照片（最佳的那张）并显示数量（点击数字打开堆叠）', 'menuTitle': '相似程度、仅堆叠、检查相似照片以及为什么（没有）堆叠', 'mode': {'groups': '仅堆叠', 'groupsTitle': '仅显示相似照片的堆叠（单独的照片不显示）'}, 'statusReading': '正在读取照片以堆叠：{done} / {total}', 'statusFaces': '正在查找人脸：{done} / {total} 张照片 — 含不同人物的堆叠会拆开', 'statusDone': '{groups} · {photos} 张照片中有 {grouped} 张在堆叠中（每个堆叠显示最佳的一张）', 'statusGroups': {'one': '{count} 个相似照片堆叠', 'other': '{count} 个相似照片堆叠'}, 'stackBadge': {'one': '{count} 张相似照片：打开堆叠', 'other': '{count} 张相似照片：打开堆叠'}, 'stackOpen': {'one': '{count} 张相似照片的堆叠', 'other': '{count} 张相似照片的堆叠'}, 'why': {'menu': '为什么（没有）堆叠？', 'title': '为什么这些照片（没有）堆叠？', 'pick': '选择 2 到 12 张照片，查看它们为什么（没有）堆叠。', 'together': '在同一个堆叠中。', 'said': '你指定了它们不属于同一个堆叠', 'unsay': '它们属于同一个堆叠', 'stillReading': '照片仍在读取中：堆叠还可能变化。'}, 'sens': {'label': '照片需要多相似才会堆叠', 'title': '越靠近“相似”，堆叠的照片越多；越靠近“几乎相同”，只堆叠几乎一样的照片'}, 'stackSel': '堆叠照片', 'stackSelTitle': '将所选照片放入一个堆叠，即使它们并不相似', 'stackFew': '请选择 2 张或更多照片进行堆叠。', 'unstack': '取消堆叠', 'unstackTitle': '取消这些照片的堆叠：它们会重新逐张显示', 'stacked': {'one': '已堆叠 {count} 张照片。', 'other': '已堆叠 {count} 张照片。'}, 'unstacked': {'one': '已取消堆叠。', 'other': '已取消 {count} 个堆叠。'}, 'removeFromStack': '从堆叠中移除照片', 'removedFromStack': '{name} 已移出堆叠，不会再与这些照片堆叠。'}, 'viewer': {'stackOpenTitle': '打开堆叠，选择保留哪些照片、哪些送去 Limbo'}, 'photos': {'rawsInGroup': {'one': '此堆叠中有 {count} 个 RAW 文件', 'other': '此堆叠中有 {count} 个 RAW 文件'}}, 'keys': {'stack': '堆叠 · 取消堆叠所选项'}})

_merge(MESSAGES, {'similar': {'keepBestTitle': '保留每组中建议的照片，并立即将其他照片送去 Limbo（可在通知中撤销）'}})

_merge(MESSAGES, {'photos': {'pairFiles': {'one': '同一张照片的 {count} 个文件（显示为一张）：', 'other': '同一张照片的 {count} 个文件（显示为一张）：'}}})

_merge(MESSAGES, {'similar': {'pairBadge': {'one': '同一张照片的 {count} 个文件（RAW+JPG）：并排查看', 'other': '同一张照片的 {count} 个文件（RAW+JPG）：并排查看'}}})

_merge(MESSAGES, {'similar': {'setCover': '设为封面', 'setCoverTitle': '将此文件作为“照片”中显示的照片（RAW + JPEG 的封面）', 'coverTitle': '封面：在“照片”中显示的文件', 'pairBadge': {'one': '同一张照片的 {count} 个文件（RAW+JPG）：打开', 'other': '同一张照片的 {count} 个文件（RAW+JPG）：打开'}}, 'viewer': {'pairLabel': {'one': '同一张照片的 {count} 个文件', 'other': '同一张照片的 {count} 个文件'}}})

_merge(MESSAGES, {'similar': {'setBest': '设为最佳', 'setCover': '设为最佳', 'setCoverTitle': '将此文件作为“照片”中显示的照片（RAW + JPEG 的最佳）', 'coverTitle': '最佳：在“照片”中显示的文件'}})

_merge(MESSAGES, {'photos': {'stacksCount': {'one': '{count} 个堆叠', 'other': '{count} 个堆叠'}, 'singlesCount': {'one': '{count} 张单独照片', 'other': '{count} 张单独照片'}}})

_merge(MESSAGES, {'photos': {'uniqueTotal': '唯一照片的估计总数：{count}', 'uniqueTotalTitle': '每个相似照片堆叠算作一张照片，每张单独照片也算一张（RAW + JPEG 算一张）'}})

_merge(MESSAGES, {'photos': {'uniqueCount': {'one': '{count} 张不重复照片（估计总数）', 'other': '{count} 张不重复照片（估计总数）'}}})

_merge(MESSAGES, {'keys': {'stackNav': '堆叠中的照片（下方条带）：上一张 · 下一张'}})

_merge(MESSAGES, {'keys': {'stackNav': '堆叠中的照片（下方条带）：↑ 下一张 · ↓ 上一张 · B 设为最佳'}, 'similar': {'bestSet': '“{name}”现在是堆叠中的最佳照片。'}})
