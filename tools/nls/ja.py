# 日本語. Build with: python3 tools/nls/build.py  (no plural forms: one string each)
MESSAGES = {
 'app': {'name': 'LionPhotos', 'tagline': '写真と動画のコレクション'},
 'workbench': {'preloadMissing': '安全なブリッジ（preload）を読み込めませんでした。LionPhotos を再起動してください。'},
 'boot': {'starting': '起動しています…', 'reading': '{folder} を開いています…'},
 'views': {'trash': 'ごみ箱の履歴', 'tools': 'ツール', 'photos': '写真', 'limbo': '保留', 'overview': '概要', 'duplicates': '重複ファイル', 'organize': '整理', 'backup': 'バックアップ',
   'project': 'プロジェクト', 'person': '人物', 'pet': 'ペット', 'place': '場所', 'album': 'アルバム'},
 'labels': {'editTitle': '名前と説明を編集', 'descriptionPlaceholder': '内容、対象、時期など（任意）', 'removeFrom': '「{name}」から外す', 'removeFromTitle': '選択した項目と「{name}」の関連付けを解除します。認識された顔もそれを指さなくなります（ファイルは変更されません）', 
   'eyebrow': 'ラベル', 'button': 'ラベル…', 'forFolder': 'このフォルダーの分類・プロジェクト・人物・ペット・場所・アルバム',
   'forFiles': '{count} 項目のラベル',
   'folderHint': 'このフォルダー内のすべて（サブフォルダーを含む）に適用されます。変わるのは LionPhotos のカタログだけで、ファイルは変更されません。',
   'filesHint': '選択したファイルに適用されます。ファイル自身の分類とプロジェクトがフォルダーのものより優先され、人物・ペット・場所は追加されます。',
   'back': '{view}に戻る', 'backTitle': '{view}に戻る（{key}）',
   'none': '（なし）', 'save': '保存', 'edit': '編集', 'add': '追加', 'open': '写真で見る', 'rename': '名前の変更', 'delete': '削除',
   'inherited': 'フォルダーから: {names}', 'fromFolder': 'フォルダーから', 'noneYet': 'プロジェクト、人物、ペット、場所はまだありません。',
   'noPhotosGroup': 'まだ写真がありません',
   'noItems': 'このコレクションに項目はありません', 'howTo': '上で作成してから、サイドバーのフォルダーか選択した写真で「ラベル…」を使います。',
   'deleteTitle': '「{name}」を削除しますか？', 'deleteMessage': '{count} 項目から外されます。ファイルは変更されません。',
   'deleteMessageEmpty': 'どの項目も使っていません。ファイルは変更されません。', 'deleteNote': 'LionPhotos のカタログからラベルが消えるだけで、写真と動画はそのままです。',
   'type': {
     'project': {'one': 'プロジェクト', 'plural': 'プロジェクト', 'new': '新しいプロジェクト', 'name': 'プロジェクト名', 'add': '+ プロジェクト', 'empty': 'プロジェクトはまだありません',
                 'lead': '仕事、研究、または依頼。'},
     'person': {'one': '人物', 'plural': '人物', 'new': '新しい人物', 'name': '人物の名前', 'add': '+ 人物', 'empty': '人物はまだいません',
                'lead': '写真に写っている人。1 枚の写真に複数の人物を付けられます。'},
     'pet': {'one': 'ペット', 'plural': 'ペット', 'new': '新しいペット', 'name': 'ペットの名前', 'add': '+ ペット', 'empty': 'ペットはまだいません',
             'lead': '写真に写っている動物。'},
     'place': {'one': '場所', 'plural': '場所', 'new': '新しい場所', 'name': '場所の名前', 'add': '+ 場所', 'empty': '場所はまだありません',
               'lead': '写真を撮った場所：街、建物、現地視察など。'},
     'sphere': {'one': '分類', 'plural': '個人または仕事', 'new': '', 'name': '', 'add': '', 'empty': '', 'lead': ''},
     'album': {'one': 'アルバム', 'plural': 'アルバム', 'new': '新しいアルバム', 'name': 'アルバム名', 'add': '+ アルバム', 'empty': 'アルバムはまだありません',
               'lead': '手作りのフォトアルバム。'}}},
 'albums': {'removeMany': 'アルバムから {count} 件を外す', 'otherSphere': 'アルバムと異なるカテゴリ：{category}', 'showWhich': '表示するアルバム', 'showAll': 'すべて', 'showPersonal': '個人', 'showProfessional': '仕事', 'noPersonal': '個人の写真があるアルバムはまだありません。', 'noProfessional': '仕事の写真があるアルバムはまだありません。', 
   'newEllipsis': '新しいアルバム…', 'moreAlbums': 'すべてのアルバム（{count}）…',
   'eyebrow': 'フォトアルバム', 'one': 'アルバム', 'lead': '旅行、パーティー、仕事のベストショットを選び、表紙と説明を付けてまとめれば、スライドショーですぐ見せられます。1 枚の写真を複数のアルバムに入れられます。ファイルはその場所のままで、何もコピーされません。',
   'new': '新しいアルバム', 'create': 'アルバムを作成', 'name': '名前', 'namePlaceholder': 'アルバム名', 'nameMissing': '新しいアルバムに名前を付けてください。',
   'description': '説明', 'descriptionPlaceholder': 'これらの写真について（任意）',
   'empty': 'アルバムはまだありません', 'howTo': '上で作成するか、写真で写真を選んで「アルバムに追加…」を使います。', 'noPhotos': 'まだ写真がありません',
   'open': 'アルバムを開く', 'edit': 'アルバムを編集', 'delete': 'アルバムを削除', 'openAlbum': 'アルバムを開く',
   'add': 'アルバムに追加…', 'addTitleHint': '選択した写真をアルバム（新規または既存）に入れます。ファイルはコピーされません。', 'addKey': 'アルバムに追加（{key}）',
   'addTitle': '{count} 項目をアルバムに追加', 'addConfirm': '追加',
   'addNote': '変わるのは LionPhotos のカタログだけです。写真は元のフォルダーにあり、同じ写真を複数のアルバムに入れられます。',
   'added': '{count} 項目を「{name}」に追加しました。',
   'remove': 'アルバムから外す', 'removeTitle': '選択した項目を「{name}」から外します（ファイルは変更されません）',
   'removed': '{count} 項目を「{name}」から外しました。',
   'viaFolder': '{count} 項目はフォルダーごと「{name}」に入っているため入っています。サイドバーのそのフォルダーで「ラベル…」からフォルダーを外してください。',
   'setCover': '表紙にする', 'isCover': 'アルバムの表紙', 'coverTitle': 'この写真をアルバムの表紙に表示します',
   'deleteMessage': '{count} 項目のアルバムを削除します。写真は変更されません。',
   'deleteMessageEmpty': 'アルバムに写真はありません。ほかは何も変わりません。', 'deleteNote': 'LionPhotos のカタログからアルバムが消えるだけで、写真と動画はそのままです。'},
 'slideshow': {'button': 'スライドショー', 'start': 'スライドショーを開始（{key}）', 'startTitle': '写真を 1 枚ずつ全画面で表示します（ビューアーでは P）',
   'pause': '一時停止（{key}）', 'space': 'スペース', 'interval': '1 枚の表示時間', 'seconds': '{n} 秒', 'fullscreen': '全画面（{key}）'},
 'settings': {'title': '設定', 'tileDetails': 'サムネイルに形式と分類を表示', 'tileDetailsHint': 'オフ：写真には RAW と動画の長さだけが表示されます。', 'focus': 'フォーカスモード', 'focusHint': '写真だけを表示：サイドバー、情報パネル、ヘッダーを隠します。同じキーか Esc で元に戻ります。'},
 'units': {'B': 'B', 'KB': 'KB', 'MB': 'MB', 'GB': 'GB', 'TB': 'TB', 'PB': 'PB', 'bytes': 'バイト'},
 'nls': {'auto': '自動', 'language': '言語', 'changeHint': 'ウィンドウが新しい言語で再読み込みされます'},
 'common': {
   'cancel': 'キャンセル', 'close': '閉じる', 'confirm': '確認', 'explorer': 'エクスプローラー', 'fileManager': 'ファイルマネージャー',
   'showIn': '{explorer}で表示', 'rootFolder': '（コレクションのフォルダー）', 'pathCopied': 'パスをコピーしました。', 'video': '動画',
   'items': '{count} 項目', 'files': '{count} ファイル',
   'photos': '写真 {count} 枚', 'videos': '動画 {count} 本',
   'photosLabel': '写真', 'videosLabel': '動画'},
 'marks': {
   'label': '評価', 'great': 'とても良い', 'ok': 'OK', 'reject': '保留に送る', 'none': '評価なし', 'all': 'すべての評価',
   'greatTitle': 'とても良い：星 1 つ（{key}）', 'okTitle': 'OK（{key}）', 'rejectTitle': '保留に送る（{key}）', 'clearTitle': '評価を外す（{key}）',
   'rejectBadge': '保留', 'option': '{name}（{count}）',
   'trashRejects': '保留中の {count} ファイルを削除',
   'trashRejectsTitle': 'このフォルダーの削除候補（{size}）をすべてごみ箱に移します。確認コードが必要です',
   'hint': '1 · 2 · 3 キーで選択項目を評価し、0 で外します。変わるのは LionPhotos のカタログだけです。'},
 'titlebar': {'openFolder': '写真フォルダーを開く（{key}）', 'placeholder': '写真と動画のフォルダーを開いてください'},
 'activitybar': {'ariaLabel': 'ビュー', 'toggleSidebar': 'サイドバーの表示・非表示（{key}）'},
 'editor': {'breadcrumbsLabel': 'フォルダー'},
 'selection': {'period': '期間', 'formats': '形式', 'folders': 'フォルダー', 'noMarks': 'なし', 'add': '追加…',
   'some': '{n}/{total}', 'allTitle': '選択したすべての項目', 'remove': '外す',
   'removeTitle': '選択した {n} 項目から「{name}」を外します（ファイルは変更されません）',
   'fromFolder': 'フォルダーからのものです。フォルダーの「ラベル…」で変更してください',
   'noAlbums': 'まだどのアルバムにも入っていません。', 'noPeople': 'まだ誰も付けられていません。',
   'noLabels': 'プロジェクトはありません。', 'noPets': 'まだペットはいません。',
   'noPlaces': 'まだ場所はありません。'},
 'sphere': {'scope': {'all': 'すべての写真から', 'personal': '個人の写真から', 'professional': '仕事の写真から', 'none': '未分類の写真から'}, 'scopeTitle': 'このページの元になる写真：タイトルバーで選択', 'personal': '個人', 'professional': '仕事', 'none': '未分類',
   'pickTitle': '個人、仕事、未分類、またはすべての写真を表示',
   'option': {'all': 'すべての写真', 'personal': '個人の写真', 'professional': '仕事の写真', 'none': '未分類'},
   'optionCount': '{name}（{count}）', 'label': '分類', 'set': '{name}にする', 'clear': '「{name}」を外す',
   'summary': '個人 {personal} · 仕事 {professional} · 未分類 {none}',
   'clearAll': '分類を外します（ファイル自身のもの。フォルダーのものは残ります）', 'fromFolder': '{count} 項目はフォルダーから分類を受け取っています'},
 'faces': {
   'auto': '顔を自動で探す', 'autoOn': 'オン：更新のたびに新しい写真を解析します。', 'autoOff': 'オフ：「今すぐインデックス」を選んだときだけ顔を探します。',
   'autoHint': 'オン：LionPhotos は更新のたびに、新しい写真と変更された写真から顔をバックグラウンドで探します。',
   'indexNow': '今すぐインデックス', 'indexNowCount': '今すぐインデックス（新しい写真 {count} 枚）', 'indexNowTitle': 'このコレクションでまだ解析していない写真から顔を探します',
   'stopRun': '停止', 'last': '前回のインデックス: {when}', 'never': '未インデックス', 'lastTitle': 'このコレクションの写真を最後に解析した日時',
   'unsupported': 'このコンピューターは顔認識に対応していません。',
   'unsupportedGpu': 'グラフィックスアクセラレーション（WebGL 対応のグラフィックスカード）が必要です。プロセッサーだけでは 1 枚に何秒もかかります。',
   'unsupportedMemory': '4 GB 以上のメモリが必要です（このコンピューターは {detail}）。',
   'gpuBoost': '専用グラフィックスカードを使う', 'gpuBoostTitle': '高性能グラフィックスカードを要求し、Chromium のブロックリストを無視して LionPhotos を再起動します。元に戻せます。', 'gpuBoostOff': '標準のグラフィックスに戻す', 'gpuBoostOffTitle': '専用グラフィックスカードを要求せずに LionPhotos を再起動します',
   'tryAnyway': 'それでも試す', 'tryAnywayTitle': '実際に認識を開始します。グラフィックスカードを使えればオンのままになります', 'technical': '技術的な詳細: {detail}',
   'eyebrow': '顔認識',
   'offTitle': 'このコレクションの顔を認識する',
   'offLead': 'LionPhotos は写真の中の顔を見つけ、似た顔をまとめます。一度名前を付ければ、その人がほかの写真にも提案として付けられ、あなたが確認または修正します。',
   'private': 'すべてこのコンピューター上で行われ、写真や顔はどこにも送られません。変わるのは LionPhotos のカタログだけで、ファイルはそのままです。',
   'start': '写真 {count} 枚から顔を探す',
   'working': '顔を探しています…', 'paused': '顔認識を一時停止中', 'ready': '顔認識はオンです',
   'progress': '写真 {done}/{total} 枚 · 顔 {faces} 件', 'summary': '写真 {photos} 枚を解析 · 顔 {faces} 件。新しい写真は更新のたびに解析されます。',
   'error': '認識が停止しました: {error}', 'pause': '一時停止', 'resume': '再開', 'stop': 'オフにする',
   'stopTitle': 'このコレクションの顔認識をオフにします（見つかった顔と人物は残ります）',
   'stopConfirm': '顔認識をオフにしますか？', 'stopMessage': '新しい写真は解析されなくなります。見つかった顔、その名前、各写真の人物は残ります。',
   'peopleLead': '写真に写っている人。1 枚の写真に複数の人物を付けられます。顔認識がオンなら、LionPhotos が顔で人物を付けます。',
   'toCheck': 'LionPhotos が提案した顔が {count} 件確認待ちです。各人物を開いてください。',
   'howToNamed': '下の顔のグループに名前を付けるか、上で人物を作成します。',
   'review': 'この人の顔を確認', 'reviewBar': '顔を確認', 'reviewShort': '顔', 'pendingTitle': '確認待ちの提案 {count} 件',
   'whoTitle': 'この人は誰？', 'groupsCount': '{count} グループ',
   'whoLead': 'まだ名前のない似た顔です。名前（新しい人物か既存の人物）を入力して Enter を押すと、グループのすべての顔に名前が付き、LionPhotos がほかの写真でもその人を提案します。× でグループから顔を外します。',
   'groupsWaiting': '写真の解析が進むと、ここにグループが表示されます。', 'groupsNone': '見つかった顔にはすべて名前があるか、無視されています。',
   'moreGroups': 'さらに {count} グループを表示',
   'namePlaceholder': '誰ですか？', 'save': '保存', 'named': '{count} 件の顔に「{name}」と名前を付けました。',
   'notInGroup': 'この人ではない：グループから外す（無視）', 'groupMeta': '顔 {count} 件 · 写真 {photos} 枚',
   'ignoreGroup': '無視', 'ignoreGroupTitle': '知らない人、背景の顔：グループから外れ、提案されなくなります',
   'ignoredLink': '無視した顔 {count} 件', 'ignoredTitle': '無視した顔',
   'ignoredLead': '付けられることも提案されることもない顔です。必要ならグループに戻せます。', 'ignoredNone': '無視した顔はありません。', 'unignore': 'グループに戻す',
   'facesCount': '顔 {count} 件',
   'suggestedTitle': '確認待ちの提案 {count} 件',
   'suggestedLead': 'LionPhotos が {name} に似ていると判断した顔です。写真にはすでに {name} が付いています。✓ で確認、× で別人（以後提案されません）。',
   'confirmAll': 'すべて確認（{count}）', 'confirmedTitle': '確認済みの顔 {count} 件',
   'noConfirmed': '確認済みの顔はまだありません。', 'confirm': '確認：この人です', 'notThem': '{name} ではない', 'someoneElse': '別の人です…',
   'deleteNote': 'LionPhotos のカタログから人物が消えるだけで、その顔は不明に戻ります。写真はそのままです。'},
 'pets': {
   'eyebrow': 'ペット認識', 'auto': 'ペットを自動で探す', 'autoOn': 'オン：更新のたびに新しい写真を解析します。', 'autoOff': 'オフ：「今すぐインデックス」を選んだときだけペットを探します。',
   'autoHint': 'オン：LionPhotos は更新のたびに、新しい写真と変更された写真からペットをバックグラウンドで探します。',
   'indexNow': '今すぐインデックス', 'indexNowCount': '今すぐインデックス（新しい写真 {count} 枚）', 'indexNowTitle': 'このコレクションでまだ解析していない写真からペットを探します',
   'stopRun': '停止', 'last': '前回のインデックス: {when}', 'never': '未インデックス', 'lastTitle': 'このコレクションの写真でペットを最後に探した日時',
   'unsupported': 'このコンピューターはペット認識に対応していません。',
   'private': 'すべてこのコンピューター上で行われ、写真はどこにも送られません。変わるのは LionPhotos のカタログだけで、ファイルはそのままです。',
   'working': 'ペットを探しています…', 'paused': 'ペット認識を一時停止中',
   'progress': '写真 {done}/{total} 枚 · 動物 {faces} 匹', 'summary': '写真 {photos} 枚を解析 · 動物 {faces} 匹。犬、猫、鳥、馬、羊、牛を見つけます。',
   'error': '認識が停止しました: {error}', 'pause': '一時停止', 'resume': '再開',
   'peopleLead': '写真に写っている動物。LionPhotos は犬、猫、鳥、馬、羊、牛を見つけ、似たものをまとめます。同じ犬種の 2 匹は似ていることがあるので、提案を確認してください。',
   'toCheck': 'LionPhotos が提案した動物が {count} 件確認待ちです。各ペットを開いてください。',
   'howToNamed': '下の動物のグループに名前を付けるか、上でペットを作成します。',
   'review': 'このペットの写真を確認', 'reviewBar': '認識結果を確認', 'reviewShort': '写真', 'pendingTitle': '確認待ちの提案 {count} 件',
   'whoTitle': 'どのペット？', 'groupsCount': '{count} グループ',
   'whoLead': 'まだ名前のない似た動物です。名前（新しいペットか既存のペット）を入力して Enter を押すと、グループのすべての動物に名前が付き、LionPhotos がほかの写真でもそのペットを提案します。× でグループから外します。',
   'groupsWaiting': '写真の解析が進むと、ここにグループが表示されます。', 'groupsNone': '見つかった動物にはすべて名前があるか、無視されています。',
   'moreGroups': 'さらに {count} グループを表示',
   'namePlaceholder': 'どのペット？', 'save': '保存', 'named': '{count} 匹に「{name}」と名前を付けました。',
   'notInGroup': 'このペットではない：グループから外す（無視）', 'groupMeta': '画像 {count} 件 · 写真 {photos} 枚',
   'ignoreGroup': '無視', 'ignoreGroupTitle': 'あなたのペットではない動物：グループから外れ、提案されなくなります',
   'ignoredLink': '無視した動物 {count} 匹', 'ignoredTitle': '無視した動物',
   'ignoredLead': '付けられることも提案されることもない動物です。必要ならグループに戻せます。', 'ignoredNone': '無視した動物はいません。', 'unignore': 'グループに戻す',
   'facesCount': '画像 {count} 件',
   'suggestedTitle': '確認待ちの提案 {count} 件',
   'suggestedLead': 'LionPhotos が {name} に似ていると判断した動物です。写真にはすでに {name} が付いています。✓ で確認、× で別の子（以後提案されません）。',
   'confirmAll': 'すべて確認（{count}）', 'confirmedTitle': '確認済みの画像 {count} 件',
   'noConfirmed': '確認済みの画像はまだありません。', 'confirm': '確認：このペットです', 'notThem': '{name} ではない', 'someoneElse': '別のペットです…',
   'deleteNote': 'LionPhotos のカタログからペットが消えるだけで、その画像は不明に戻ります。写真はそのままです。'},
 'species': {'dog': '犬', 'cat': '猫', 'bird': '鳥', 'horse': '馬', 'sheep': '羊', 'cow': '牛'},
 'home': {'button': 'ホーム', 'title': 'ホーム：コレクションのすべての写真と動画、フィルターなし（{key}）',
   'allYears': 'すべての年を見る', 'allYearsTitle': 'すべての年の写真をもう一度表示します', 'year': '年'},
 'panels': {'folders': 'フォルダー', 'albums': 'アルバム', 'labels': 'ラベル', 'dates': '日付', 'title': 'サイドバーの{name}（もう一度クリックで非表示）',
   'allAlbums': 'すべてのアルバム', 'manage': '{name}を管理', 'allDates': 'すべての日付', 'datesHint': '年を選ぶと、写真にはその年の写真だけが表示されます（撮影日、またはファイルの日付で）。'},
 'sidebar': {
   'title': 'ライブラリ', 'folder': 'コレクション', 'folders': 'フォルダー', 'resize': 'ドラッグしてサイズを変更',
   'depthLabel': 'サブフォルダーの階層', 'depthDecrease': '階層を減らす', 'depthIncrease': '階層を増やす', 'unlimited': 'すべての階層',
   'hint': {'unlimited': 'すべてのサブフォルダーを読み込みます。', 'none': 'フォルダー自体だけ（サブフォルダーなし）。', 'depth': 'サブフォルダーを {count} 階層まで読み込みます。'},
   'refresh': '更新', 'refreshFolder': 'このフォルダーを更新',
   'refreshTitle': '「{folder}」とそのサブフォルダーで新しいファイルと変更されたファイルを探します（{key}）。変わっていないファイルのサムネイルはそのままです。',
   'scope': '読み込むのは「{folder}」とそのサブフォルダーだけで、ディスクのほかの場所は読みません。',
   'changeFolder': '変更…', 'changeFolderTitle': '別のフォルダーを開く（{key}）', 'openFolder': 'フォルダーを開く…', 'stop': '停止（{key}）',
   'scanCount': '{count} ファイルを検出 · 新規または変更 {changed}',
   'emptyTree': 'フォルダーを開くと、ここにサブフォルダーが表示されます。', 'moreFolders': '… ほか {count} フォルダー'},
 'statusbar': {
   'ready': '準備完了', 'scanning': 'フォルダーを読み込み中: {count} ファイル',
   'thumbs': 'サムネイル {done} / {total}', 'thumbsTitle': 'サムネイルをバックグラウンドで作成中。画面に表示中のものから',
   'previews': 'プレビュー {done} / {total}', 'stopPreviews': '停止',
   'selected': '{count} 項目を選択 · {size}',
   'revealTitle': '選択した項目を表示（クリックするたびに次へ）',
   'theme': 'テーマ', 'themeAuto': '自動', 'themeLight': 'ライト', 'themeDark': 'ダーク', 'themeTeal': 'ブルー',
   'themeAutoTitle': 'システムのテーマに合わせる', 'themeLightTitle': 'ライトテーマ', 'themeDarkTitle': 'ダークテーマ', 'themeTealTitle': 'ブルーテーマ：ロゴの青'},
 'welcome': {
   'logoAlt': '{app} のロゴ', 'lead': 'フォルダーを開くと、写真と動画をサムネイルで表示し、名前・カメラ・作成者・コーデックで検索し、フォルダーに整理できます。',
   'openFolder': 'フォルダーを開く', 'collections': '以前開いたコレクション',
   'shortcuts': {'openFolder': 'フォルダーを開く', 'refresh': '新しいファイルと変更されたファイルを探す', 'search': '検索'},
   'note': 'サムネイルは一度だけ作成され、小さなローカルキャッシュに保存されます。ファイルが変わったときだけ作り直します。何もコンピューターの外に出ません。'},
 'broad': {'eyebrow': 'とても大きなフォルダー', 'diskTitle': 'ディスク全体を読み込みますか？', 'homeTitle': 'ユーザーフォルダー全体を読み込みますか？',
   'message': 'LionPhotos が読み込むのは、選んだフォルダーとそのサブフォルダーだけです。「{folder}」にはその中のすべてが含まれるため、すべてのフォルダーが読み込まれます。',
   'note': '通常は、写真があるフォルダー（たとえば「ピクチャ」やプロジェクトのフォルダー）を選ぶほうが適しています。',
   'confirm': 'それでも読み込む'},
 'photos': {'noAlbum': 'アルバムにない写真のみ', 'noAlbumTitle': 'まだどのアルバムにも入っていない写真と動画だけを表示します', 'noAlbumClear': 'アルバム内の写真も表示', 
   'modeLabel': '表示方法', 'modeGrid': 'グリッド', 'modeList': 'リスト',
   'gridLabel': '写真と動画', 'search': '検索', 'searchPlaceholder': '名前、フォルダー、カメラ、作成者、コーデックを検索…',
   'kind': {'all': 'すべて', 'images': '写真', 'videos': '動画'}, 'year': '年', 'allYears': 'すべての年',
   'sort': {'': '並べ替え', 'newest': '新しい順', 'oldest': '古い順', 'name': '名前', 'size': '大きい順'},
   'filters': 'フィルター', 'filtersTitle': '種類、年、評価、サブフォルダー', 'more': 'その他', 'moreTitle': '選択項目のその他の操作：開く、名前の変更、移動、整理、ごみ箱…', 'thisFolderOnly': 'このフォルダーのみ',
   'subfolders': 'サブフォルダー', 'subfoldersHint': '表示中のフォルダーのサブフォルダーの項目も表示します',
   'zoom': 'サムネイルのサイズ', 'toggleInfo': '情報パネル（{key}）', 'selectGroup': 'すべて選択', 'select': '選択',
   'selected': '{count} 項目を選択', 'open': '開く', 'moveTo': 'フォルダーへ移動…', 'organize': '日付で整理',
   'trash': 'ごみ箱に移動', 'clearSelection': '選択を解除', 'clearFilters': 'フィルターをクリア',
   'empty': {'title': 'ここには写真も動画もありません', 'hint': 'このフォルダーには写真も動画もありません。ツリーで別のフォルダーを選ぶか、「サブフォルダー」をオンにしてください。',
             'scanning': 'フォルダーを読み込み中…', 'filtered': 'フィルターに一致するものはありません', 'filteredHint': '別の語句、年、種類を試してください。'}},
 'list': {'name': '名前', 'folder': 'フォルダー', 'type': '種類', 'dimensions': 'サイズ（px）', 'size': 'サイズ', 'date': '日付', 'details': 'カメラ · 作成者 · コーデック'},
 'category': {'original': 'オリジナル', 'edited': '編集済み', 'raw': 'RAW', 'video': '動画', 'graphic': 'その他の画像',
   'hint': {'original': '編集していないカメラの写真（JPEG、HEIC、TIFF）', 'edited': '編集したコピー：名前に -Edit、-2… が付くもの、または Lightroom、Photoshop などで保存したもの',
            'raw': 'カメラの RAW ファイル（CR2、NEF、ARW、DNG…）', 'video': '動画', 'graphic': 'PNG、GIF、WebP などの画像：スクリーンショット、スキャン、イラスト'}},
 'info': {'organize': '整理', 'addTo': '追加先', 'notOrganized': 'まだどのアルバム・人物・場所・プロジェクトにも入っていません', 'selectionFiles': 'ファイル', 'folders': '{count} 個のフォルダー', 'next': '次の写真', 'nextTitle': 'パネルはそのままで次の写真へ（Alt+↓、Alt+↑ で戻る）', 'inThis': 'この中に', 'details': '詳細', 'fileDetails': 'ファイルとカメラ',
   'empty': '写真か動画を選ぶと詳細が表示されます。', 'selection': '選択', 'reveal': '表示', 'openDefault': '既定のアプリで開く', 'copyPath': 'パスをコピー',
   'file': 'ファイル', 'format': '形式', 'size': 'サイズ', 'taken': '撮影日', 'modified': '更新日', 'folder': 'フォルダー',
   'image': '画像', 'dimensions': '解像度', 'encoding': 'エンコード', 'compression': {'baseline': 'JPEG ベースライン', 'progressive': 'JPEG プログレッシブ'},
   'orientation': '向き', 'orientationRotated': 'カメラにより回転',
   'video': '動画', 'container': 'コンテナー', 'videoCodec': '動画コーデック', 'resolution': '解像度', 'fps': 'フレームレート', 'duration': '長さ',
   'bitrate': 'ビットレート', 'audioCodec': '音声', 'noAudio': '音声なし', 'rotation': '回転', 'mono': 'モノラル', 'stereo': 'ステレオ',
   'camera': 'カメラ', 'device': 'デバイス', 'lens': 'レンズ', 'exposure': '露出', 'aperture': '絞り', 'iso': 'ISO', 'focal': '焦点距離',
   'flash': 'フラッシュ', 'flashOn': '発光', 'flashOff': '発光なし', 'location': '位置（GPS）',
   'authorship': '作成者情報', 'author': '作成者', 'copyright': '著作権', 'title': 'タイトル', 'description': '説明', 'software': 'ソフトウェア',
   'integrity': '内容'},
 'viewer': {'opening': '実際のサイズで開いています…', 'edit': '編集', 'editTitle': '編集パネルを表示または折りたたむ：カテゴリ、アルバム、補正、説明、作者と場所（I）', 'outOfFilter': 'この写真は「{category}」になりました。ビューアーを開いている間はここに表示されます。閉じた後は、タイトルバーのカテゴリフィルター「{category}」で見つかります。', 'zoomLevel': 'ズーム', 'zoomIn': '拡大（+）', 'zoomOut': '縮小（−）', 'zoomToggle': '画面に合わせる ↔ 実際のサイズ（Z）・ホイールでポインターの位置を拡大、ドラッグで移動', 'label': 'ビューアー', 'previous': '前へ（←）', 'next': '次へ（→）', 'zoom': '実際のサイズ',
   'imageUnsupported': '{format} ファイルはここでは原寸表示できません。これはサムネイルです。',
   'videoUnsupported': 'この動画（{format}）はここでは再生できません。',
   'rawFull': 'カメラの JPEG（原寸） · {size}', 'rawPreview': 'カメラの JPEG · {size}（このファイルに保存された最大のもの）',
   'rawNoteTitle': 'RAW ファイルには、カメラが自分の設定で作った JPEG が入っています。これはその画像で、現像前に Lightroom やシステムのビューアーが表示するものと同じです。'},
 'previews': {
   'generate': 'プレビューを作成', 'one': 'この動画の 5 秒プレビューを作成', 'folderTitle': 'このフォルダーの動画の 5 秒プレビューを作成',
   'eyebrow': '動画プレビュー', 'nothingToDo': 'これらの動画にはすでにプレビューがあります。',
   'scope': {'one': 'この動画', 'folder': 'このフォルダーの動画', 'all': 'インデックス済みのすべての動画', 'selected': '選択した {count} 本の動画'},
   'confirm': {'title': '{count} 本の動画のプレビューを作成しますか？',
     'message': '{scope}について、最初の 5 秒をサムネイルの大きさで短いクリップにします。動画にマウスを重ねると再生されます。',
     'videos': '動画', 'time': '予想時間', 'about': '約 {time}',
     'note': '処理に時間がかかります。バックグラウンドで 1 本ずつ、サムネイルの後に行われます。LionPhotos はそのまま使え、ステータスバーで停止できます。',
     'start': 'バックグラウンドで作成'},
   'started': '{count} 本の動画をプレビューの待ち行列に追加しました。'},
 'overview': {
   'eyebrow': 'コレクション', 'title': '概要', 'collection': '写真と動画', 'itemsUnit': '項目',
   'size': 'サイズ', 'period': '期間', 'previews': '動画プレビュー',
   'kinds': '種類別のファイル', 'kindsHint': '花びらが大きいほどファイルが多い。クリックで表示。', 'total': '合計',
   'legend': {'kind': '種類', 'files': 'ファイル', 'size': 'サイズ'},
   'previewsHint': 'インデックス済みのすべての動画の 5 秒プレビューをバックグラウンドで作成します。', 'noVideos': 'このコレクションに動画はありません。',
   'byYear': '年別', 'byYearHint': '年をクリックで表示', 'formats': '形式', 'cameras': 'カメラとスマートフォン', 'camerasHint': 'ファイルのメタデータから',
   'codecs': '動画コーデック', 'authors': '作成者', 'noMeta': 'サムネイルの作成に合わせて表示されます。',
   'cache': 'サムネイルのキャッシュ', 'cacheHint': '一度だけ作成。ファイルが変わったときだけ作り直します',
   'cacheThumbs': 'サムネイル', 'cachePreviews': '動画プレビュー', 'cacheAverage': '平均サムネイル', 'cacheFile': 'キャッシュファイル', 'clearCache': 'キャッシュを消去…'},
 'dupes': {
   'eyebrow': '同じ内容（SHA-256）', 'title': '重複ファイル',
   'lead': '名前ではなく内容で同一のコピーを探します。まずサイズ、次に各ファイルの先頭と末尾、必要なときだけファイル全体を比べます。残すコピーを選ぶと、ほかはごみ箱へ移ります。',
   'find': '重複ファイルを探す', 'again': 'もう一度探す', 'starting': '起動しています…',
   'stage': {'partial': '先頭と末尾を比較中 · {done} / {total}', 'full': '同一内容を確認中 · {pct}%'},
   'wasted': '余分なコピーが使っている容量', 'notRun': 'まだ確認していません', 'groups': '同一ファイルのグループ {count} 件',
   'none': '重複ファイルはありません', 'noneHint': 'このコレクションの写真と動画はすべて一意です。',
   'copies': '{count} 個のコピー', 'each': 'それぞれ', 'keep': '残す', 'toTrash': 'ごみ箱',
   'trashCopies': '{count} 個のコピーをごみ箱に移動',
   'trashAll': '余分なコピー {count} 個をごみ箱に移動…',
   'more': 'さらに表示（残り {count}）'},
 'organize': {'theme': 'テーマ', 'themePlaceholder': '例：卒業式', 'split': 'Raw/ と Img/ に分ける', 'splitHint': '各フォルダーで、カメラの RAW（と .xmp）は Raw/、JPG、PNG、HEIC などは Img/ へ。動画はフォルダーに残ります。', 'byAlbum': 'アルバムごとのフォルダー', 'byAlbumHint': '各アルバムを「年/年-月-日-アルバム」へ。日付は最初の写真の日付です。2 つのアルバムにある写真は先に始まるほうへ。各アルバムは新しいフォルダーで写真を保ちます。', 'noAlbums': '写真のあるアルバムはまだありません。', 'runAlbums': 'アルバム {count} 件を整理（{photos}）', 'photos': '写真 {count} 枚', 
   'eyebrow': '整理', 'title': 'コレクションを整理', 'lead': '変更のたびにまず計画を表示し、入力するコードを求めます。変更は下で元に戻せます。',
   'byDate': '日付別フォルダー', 'byDateHint': '撮影日（EXIF）を使い、ないときはファイルの日付を使います。',
   'pattern': {'yearSlashMonth': '2024 / 2024-07', 'yearMonth': '2024-07', 'year': '2024', 'yearSlashDay': '2024 / 2024-07-14', 'dayTheme': '2024-07-14-テーマ'},
   'scope': {'selected': '{count} 項目を選択', 'view': '写真に表示中の {count} 項目'},
   'run': '{count} 項目を整理…', 'moreFolders': '… ほか {count} フォルダー',
   'moveTitle': 'フォルダーへ移動', 'moveLead': '選んだフォルダーへ項目を移動し、種類ごとのサブフォルダーに分けます。同じ写真のファイル（RAW、Lightroom の付属ファイル、編集済みとオリジナルの JPEG）は一緒に移動します。',
   'moveRun': 'フォルダーへ移動…', 'history': '最近の操作', 'noHistory': 'まだ操作はありません。', 'undone': '取り消し済み',
   'trashNote': 'ごみ箱から元に戻せます'},
 'move': {
   'eyebrow': 'フォルダーへ移動', 'title': '{count} 項目を移動', 'destination': '移動先',
   'newFolder': 'このコレクション内の新しいフォルダー', 'newFolderDefault': '選択 {date}', 'otherFolder': '別のフォルダー', 'choose': '選択…', 'noneChosen': 'フォルダーが選ばれていません',
   'split': '種類ごとにサブフォルダーに分ける',
   'sub': {'raw': 'RAW', 'original': 'JPG', 'edited': '編集済み', 'video': '動画'},
   'subLabel': {'raw': 'RAW ファイル', 'original': 'オリジナル写真', 'edited': '編集済み写真', 'video': '動画'},
   'subHint': {'raw': 'CR2、NEF、ARW、DNG… と .xmp', 'original': 'カメラの JPEG（未編集）', 'edited': '-Edit、-2、Lightroom、Photoshop…', 'video': 'MP4、MOV…'},
   'related': '関連ファイルも移動', 'relatedHint': '同じフォルダーにある同じ写真のファイル：RAW、Lightroom の .xmp、同じ名前の編集済みとオリジナルの JPEG。',
   'continue': '続ける…'},
 'backup': {
   'eyebrow': 'フォルダー単位のバックアップ', 'title': 'バックアップ',
   'lead': '任意のディスク上のマスターフォルダーとバックアップフォルダーを選びます。名前や場所に関係なく、サブフォルダーごと内容で比較し、両方にあるもの、バックアップにないもの、バックアップにだけあるものを表示します。',
   'master': 'マスターフォルダー', 'backup': 'バックアップフォルダー', 'noFolder': 'フォルダーなし', 'pickHint': 'フォルダーを選んでください…',
   'choose': '選択…', 'change': '変更…', 'useCollection': '開いているコレクションを使う', 'swap': 'マスターとバックアップを入れ替え',
   'exact': 'すべてのファイルの内容を確認（低速）',
   'exactHint': 'オフの場合、両側でサブフォルダー・名前・サイズ・日付が同じファイルは読み込まずに同一とみなします。オンにすると、可能な組み合わせをすべてバイト単位で比較します（SHA-256）。',
   'compare': '比較', 'compareAgain': 'もう一度比較',
   'safe': '比較は読み込むだけです。コピーには確認コードが必要で、ファイルを置き換えることはなく、各コピーを元ファイルと照合します。',
   'stage': {'scan': 'フォルダーを一覧中… {count} ファイル', 'quick': '同じサイズのファイルを比較中… {done}/{total}', 'full': '確認のためファイル全体を読み込み中… {size} の {pct}%'},
   'tab': {'onlyMaster': 'マスターのみ', 'both': '両方', 'onlyBackup': 'バックアップのみ'},
   'tabHint': {'onlyMaster': 'まだバックアップにありません。コピーしてバックアップを完成させます。', 'both': '同じ写真が両側の同じサブフォルダー、または別の場所にあります。', 'onlyBackup': 'バックアップにはあるがマスターにはない：マスターから削除されたか、最初からなかったもの。'},
   'sub': {'missingInBackup': 'バックアップにない', 'allBackedUp': 'すべてバックアップ済み', 'both': '同じ場所 {same} · 別の場所 {elsewhere}', 'missingInMaster': 'マスターにない', 'nothingExtra': '余分なものなし'},
   'empty': {'onlyMaster': 'マスターの写真はすべてバックアップにあります。', 'both': '両側にある写真はありません。', 'onlyBackup': 'バックアップにはマスターにないものはありません。'},
   'samePlace': '同じ場所', 'inBackupAt': 'バックアップの {path}', 'copies': '{count} 個のコピー', 'rootFolder': '（メインフォルダー）',
   'layout': 'コピーの配置', 'layoutMirror': '同じサブフォルダー', 'layoutDate': '日付別フォルダー（YYYY/YYYY-MM）',
   'copyToBackup': '{count} ファイルをバックアップにコピー…',
   'copyToMaster': '{count} ファイルをマスターにコピー…',
   'copyStarted': '{count} ファイル（{size}）をバックグラウンドでコピー中…',
   'copying': 'コピー中 {done}/{total}…', 'copied': '{count} ファイルをコピーして照合しました（{size}）。',
   'more': 'さらに {count} 件を表示'},
 'renameFile': {'eyebrow': 'ファイル', 'title': '「{name}」の名前を変更', 'label': '新しい名前（拡張子はそのまま）', 'button': '名前の変更…'},
 'contextMenu': {'addToAlbum': 'アルバムに追加', 'rename': '名前の変更…', 'renameOne': '名前の変更は一度に 1 ファイルだけです', 'category': '分類', 'sendLimbo': '保留に送る', 'restore': '写真に戻す', 'selected': '{count} 項目を選択'},
 'projects': {'ofAlbum': 'プロジェクト', 'noProject': 'プロジェクトなし', 'open': 'プロジェクトを開く', 'status': '状況', 'client': '依頼元', 'clientPlaceholder': '機関、クライアント、授業など', 'place': '場所', 'noPlace': '場所なし', 'due': '期限', 'team': 'チーム', 'removeFromTeam': '{name} をチームから外す', 'addToTeam': '人物を追加…', 'noPeople': '人物にまだ誰もいません。', 'albumsCount': 'アルバム {count} 件', 'checkBackup': 'バックアップを確認', 'newAlbum': 'プロジェクトに新しいアルバム', 'addAlbum': 'アルバムを加える…', 'albumsTitle': 'プロジェクトのアルバム {count} 件', 'panel': 'プロジェクトのパネル', 'all': 'すべて', 'noneInStatus': 'この状況のプロジェクトはありません。', 'st': {'active': '進行中', 'selecting': '選定中', 'delivered': '納品済み', 'archived': 'アーカイブ'}, 'stat': {'photos': '写真と動画', 'sorted': '仕分け済み', 'unsorted': 'マークなし {count} 枚', 'noMark': 'マークなし', 'toDelete': '削除候補', 'edited': '編集済みの RAW', 'editedHint': '横に編集版があるもの', 'chosen': '選択済み', 'chosenHint': '{albums}に写真 {count} 枚', 'alt': '音声解説あり', 'altMissing': 'アルバム内でまだないもの {count} 枚', 'backup': 'バックアップ'}},
 'plugins': {'view': {'exportChosen': '選択した {count} 件を書き出す…', 'selectAll': 'すべて選択', 'clear': '選択を解除', 'pickHint': '書き出すアルバムとプロジェクトをクリックするか、書き出しを開いてそこで選びます。', 'manage': 'プラグインを管理', 'version': 'バージョン {version}', 'empty': '写真のあるアルバムやプロジェクトはまだありません', 'emptyHint': 'このプラグインが書き出せるもの：{types}。作成して写真を追加してください。', 'tabTitle': 'プラグインのページ：アルバムとプロジェクトを書き出す'}, 'eyebrow': 'プラグイン', 'title': 'プラグイン', 'hint': 'アルバムやプロジェクトをページ（HTML、CSS、JavaScript）として書き出すパッケージです。LionPhotos の中でコードは実行しません。', 'install': 'プラグインをインストール…', 'installed': 'プラグイン「{name}」{version} をインストールしました。', 'installFailed': 'インストールできませんでした：{error}', 'removed': 'プラグインを削除しました（ごみ箱にあります）。', 'remove': '削除', 'enable': 'オン', 'disable': 'オフ', 'none': '書き出し用のプラグインがインストールされていません', 'noneHint': '.lionplugin パッケージをインストールすると、アルバムやプロジェクトをページとして書き出せます。', 'noneInstalled': 'インストールされたプラグインはありません。', 'export': {'zip': 'すべてを含む .zip も作成する', 'zipHint': 'ページと写真をまとめた 1 つのファイルをフォルダーの隣に作成します（送信・添付用）。', 'zipDone': 'すべてのコピーが「{zip}」にあります。', 'zipSkipped': '.zip は作成されませんでした（4 GB 超）。フォルダーにすべて入っています。', 'showZip': '.zip を表示', 'button': '書き出し…', 'buttonTitle': 'プラグインでページとして書き出す', 'title': 'プラグインで書き出す', 'which': 'プラグイン', 'what': '書き出す内容', 'size': '写真のサイズ', 'sizePx': '最大 {n} px', 'sizeFull': '元のサイズ', 'originals': '元のファイルを含める', 'next': 'フォルダーを選んで書き出す…', 'note': 'ページと写真のコピーを入れた新しいフォルダーを作成します。写真そのものは変更しません。', 'count': '{collections}の写真 {count} 枚', 'collections': 'アルバム・プロジェクト {count} 件', 'empty': '書き出すものがありません。選んだアルバムやプロジェクトに写真がありません。', 'running': '書き出し中…', 'progress': '写真 {count} 枚中 {done} 枚', 'done': '写真 {count} 枚を「{folder}」に書き出しました。', 'someFailed': '{count} 枚は変換できませんでした。', 'failed': '書き出しに失敗しました：{error}', 'canceled': '書き出しを取り消しました。', 'openPage': 'ページを開く', 'showFolder': 'フォルダーに表示'}},
 'crop': {'title': '切り抜きと傾き補正', 'open': '切り抜きと傾き補正…', 'canvasLabel': '切り抜き枠付きの写真：内側をドラッグで移動、角と辺でサイズ変更', 'levelHint': '地平線（またはまっすぐであるべきもの）に沿って線を引いてください', 'ratio': {'free': '自由', 'original': '元の比率'}, 'social': {'igPortrait': 'Instagram 縦長', 'igGrid': 'Instagram グリッド', 'igSquare': 'Instagram 正方形', 'story': 'ストーリーズ、リール、TikTok', 'youtube': 'YouTube と画面', 'link': 'リンク（Facebook、LinkedIn）', 'pinterest': 'Pinterest', 'xHeader': 'X ヘッダー', 'linkedinCover': 'LinkedIn カバー'}, 'swapTitle': '縦 ↔ 横 (X)', 'swap': '比率を回転', 'keepRatio': '縦横比を保持', 'shape': '比率', 'socialTitle': 'SNS', 'rotateTitle': '回転', 'rotateLeft': '左に 90°', 'rotateRight': '右に 90°', 'rotateLeftTitle': '反時計回りに 90° 回転', 'rotateRightTitle': '時計回りに 90° 回転', 'straighten': '傾き補正', 'level': '地平線で水平にする', 'levelNote': 'スライダーをドラッグするか、「水平にする」で地平線に線を引きます。スライダーをダブルクリックで 0° に戻ります。', 'reset': 'リセット', 'apply': '適用', 'result': '結果：{size} px · {ratio}', 'preparing': '写真を準備しています…', 'cannot': 'この写真を切り抜き用に開けませんでした。', 'cropped': '切り抜き済み', 'turned': '{deg}° 回転', 'straightened': '{deg}° 傾き補正', 'remove': '切り抜きを解除', 'removeTitle': '回転も傾き補正もしない元の写真全体に戻します'},
 'trashlog': {'eyebrow': 'クリーンアップ', 'title': 'ごみ箱の履歴', 'lead': 'LionPhotos がシステムのごみ箱に移したファイルと、リンボで空いた容量です。ごみ箱を空にするとディスクの容量が戻ります。', 'loading': '履歴を読み込んでいます…', 'emptyTitle': 'まだ何もごみ箱に移していません', 'emptyLead': 'リンボの写真や重複コピーを削除すると、空いた容量とともにここに表示されます。', 'files': '{count} 件', 'freedByLimbo': 'リンボで空いた容量', 'freedHint': '削除候補に印を付けてごみ箱に移した写真', 'thisMonth': '今月のリンボ', 'fromDuplicates': '重複ファイル', 'allSent': 'ごみ箱に移した合計', 'unknownSize': '{count} 件はサイズ未記録（以前のバージョン）', 'byMonth': 'リンボで空いた容量（月別）', 'byMonthHint': '削除があった直近 12 か月', 'noLimbo': 'リンボからごみ箱に移したものはまだありません。', 'listTitle': 'ごみ箱に移したファイル', 'listCount': '{count} 件 · {size}', 'search': '名前やフォルダーで検索', 'nothingFound': 'この条件のファイルはありません。', 'showMore': 'さらに表示（残り {count} 件）', 'copy': '一覧をコピー', 'copyTitle': '一覧（日付、ファイル、フォルダー、バイト、元）をコピーして表計算に貼り付けます', 'copied': '{count} 行をコピーしました。', 'copyFailed': '一覧をコピーできませんでした。', 'col': {'when': '日時', 'file': 'ファイル', 'folder': 'フォルダー', 'size': 'サイズ', 'bytes': 'バイト', 'from': '元'}, 'from': {'all': 'すべて', 'limbo': 'リンボ', 'duplicates': '重複', 'other': '選択', 'unknown': '—'}},
 'adjust': {'highlights': 'ハイライト', 'whites': '白レベル', 'blacks': '黒レベル', 'temperature': '色温度', 'tint': '色かぶり補正', 'vibrance': '自然な彩度', 'bw': '白黒', 'bwRed': 'レッド', 'bwGreen': 'グリーン', 'bwBlue': 'ブルー', 'sharpness': 'シャープ', 'texture': 'テクスチャ', 'clarity': '明瞭度', 'vignette': '周辺光量', 'groupChanged': 'このグループに調整があります', 'eyedropper': 'スポイト', 'eyedropperTitle': 'ホワイトバランス：グレーまたは白であるべき点をクリック', 'eyedropperHint': '写真のグレーまたは白であるべき点をクリックしてください（Esc でキャンセル）。', 'auto': '自動', 'autoTitle': '写真そのものから露光量、白レベル、黒レベル、コントラスト、自然な彩度を計算', 'presets': 'プリセット', 'presetsTitle': '名前を付けて保存した調整。ほかの写真に適用できます', 'presetSave': 'この写真の調整を保存…', 'presetSaveTitle': '新しいプリセット', 'presetName': '名前', 'presetSaveConfirm': '保存', 'presetSaved': 'プリセット「{name}」を保存しました。', 'presetDelete': 'プリセットを削除', 'bwTitle': '写真を白黒にします。下のスライダーで各色を明るく・暗くします', 'detailNoGpu': 'GPU の起動時にエラーが発生したため、シャープ、テクスチャ、明瞭度を有効にできません。', 'compare': 'ビフォー・アフター', 'compareTitle': 'ビフォー・アフター：線をドラッグして比較', 'before': '前', 'after': '後', 'group': {'light': '光', 'color': '色', 'detail': 'ディテール', 'effects': '効果'}, 'applying': '補正を適用しています…', 'title': '補正', 'exposure': '露出', 'contrast': 'コントラスト', 'shadows': 'シャドウ', 'saturation': '彩度', 'resetOne': 'ダブルクリックで 0 に戻す', 'reset': 'リセット', 'none': '補正なし', 'edited': '編集済み', 'someAdjusted': '{total} 枚中 {count} 枚を補正', 'allSelected': 'スライダーを動かすと、選択した {count} 枚すべてにその値が適用されます。', 'copy': '補正をコピー', 'copied': '補正をコピーしました。ほかの写真に貼り付けられます。', 'paste': '補正を貼り付け', 'pasteMany': '{count} 枚に貼り付け', 'pasteTitle': 'コピーした補正を選択した {count} 枚に適用', 'save': '編集したコピーを保存…（{count}）', 'saveTitle': '元の写真の隣にメタデータ付きの新しい JPEG を作成します。元の写真は変わりません', 'rendering': '編集した写真を作成しています…', 'renderingN': '{total} 枚中 {done} 枚を作成中…', 'cannotSave': 'これらの写真はここでは原寸で作成できません（JPEG、PNG、WebP… とカメラ JPEG 付きの RAW のみ）。', 'viewerNote': 'LionPhotos で補正済み · \\ を押している間は元の写真'},
 'describe': {'writeNothing': 'LionPhotos でまだ何も入力されていないため、ファイルに書き込む内容はありません（表示されているのはファイル自体の情報です）。', 'mixedShort': '値が異なります — 入力した内容はすべてに適用されます', 'fromFileBadge': 'ファイルから', 'fromFileTitle': '写真自身のメタデータの内容です。変更すると独自の値になります', 'pendingTitle': 'LionPhotos で入力済み、まだファイルに書き込まれていません', 'pending': '{count} 個の項目がまだファイルに書き込まれていません', 'mixedPick': '値を見て、すべてに適用するものを選ぶ', 'different': '{count} 種類', 'emptyValue': '（空）', 'noneYet': 'まだ説明がありません', 'inSome': '{value}（{total} 枚中 {n} 枚）', 'noAlt': '音声解説なし', 'missingOf': '{total} 枚中 {count} 枚に音声解説がありません', 'noAuthorPlace': 'まだ作者も場所もありません', 'keywordsAdd': '追加…', 'keywordRemove': '「{word}」を外す', 'moreFields': 'その他の項目：肩書き、指示事項', 'lessFields': '項目を減らす', 'undoWhat': '元に戻す：{what}（{count} 枚）', 'undoTitle': '最後の変更を元に戻す（Ctrl+Z）', 'redo': 'やり直す', 'redoTitle': 'やり直す（Ctrl+Shift+Z）', 'undone': '元に戻しました（{count} 枚）：{what}。', 'redone': 'やり直しました（{count} 枚）：{what}。', 'changedMany': '{count} 枚の写真を変更しました：{what}。', 'nothingToUndo': '元に戻す操作はありません。', 'nothingToRedo': 'やり直す操作はありません。', 'headline': '見出し', 'headlineHint': '写真について一行で（場所と日付は不要）', 'authorTitle': '役職', 'authorTitleHint': 'カメラマン、インターン…', 'placeTitle': '撮影者と場所', 'sublocation': '場所（詳細）', 'sublocationHint': '例：コンベンションセンター、本キャンパス', 'city': '市区町村', 'state': '都道府県・州', 'country': '国', 'keywords': 'キーワード', 'keywordsHint': 'カンマで区切る', 'instructions': '指示', 'instructionsHint': '解禁日時、使用制限…', 'fromFile': '写真のメタデータ：{value}', 'allSelected': 'ここに書いた内容は選択中の {count} 枚すべてに適用されます。', 'write': '{count} 個のファイルに書き込む…', 'writeHint': 'このメタデータをファイルに書き込み、他のソフトでも使えるようにします：JPEG はファイル内に、その他の形式は横の .xmp ファイルに', 'author': '撮影者', 'authorHint': '撮影した人。書き出したページのクレジットになります', 'authorFromCamera': '写真のメタデータ：{name}', 'title': '説明', 'caption': '写真の説明', 'captionHint': '写真に写っているもの（キャプション）', 'alt': '音声解説', 'altHint': '画像が見えない人のために説明してください。スクリーンリーダーが読み上げるテキストです', 'mixed': 'テキストが異なります。ここに書いた内容がすべてに適用されます', 'inFile': 'ファイル内：「{text}」', 'useFile': '使用', 'missing': '音声解説のない項目が {count} 件', 'missingShort': '音声解説なし {count} 件'},
 'folderAlbums': {'button': 'フォルダーから…', 'buttonTitle': 'コレクションのフォルダーからアルバムを作成', 'fromFolder': 'このフォルダーからアルバムを作成', 'title': 'フォルダーからアルバム', 'lead': 'チェックしたフォルダーごとに、フォルダー名のアルバムを作ります。', 'leadFolder': '「{folder}」の中で、チェックしたフォルダーごとにアルバムを作ります。', 'modeLabel': 'どのフォルダー', 'mode': {'top': '最初の階層', 'leaf': '写真が入っているフォルダー', 'none': '自分で選ぶ'}, 'modeHint': {'top': 'すぐ下の各フォルダーが、サブフォルダーごとアルバムになります。', 'leaf': '写真を直接含む各フォルダーがアルバムになります。', 'none': '未選択：下のフォルダーをチェックしてください。'}, 'withParent': '上のフォルダー名を付ける（「イタリア · ローマ」）', 'listLabel': 'フォルダー', 'already': 'すでにアルバムです', 'nameTaken': '同じ名前のアルバムがあります', 'create': '{count} 個のアルバムを作成', 'createNone': 'フォルダーをチェックしてください', 'photos': '写真 {count} 枚', 'note': '各アルバムはフォルダー全体と結び付きます。あとでフォルダーに入れた写真もアルバムに入ります。変わるのは LionPhotos のカタログだけで、ファイルの移動やコピーはしません。', 'done': 'フォルダーから {count} 個のアルバムを作成しました。', 'show': 'アルバムを表示'},
 'openWith': {'title': 'プログラムから開く', 'open': '開く', 'searching': 'プログラムを探しています…', 'none': '写真や動画のプログラムが見つかりません', 'default': '既定のプログラム', 'system': '別のアプリを選ぶ…', 'other': 'その他のプログラム…', 'manyTitle': '{app} で {count} 個のファイルを開きますか？', 'manyMessage': 'ファイルはそれぞれプログラムで開かれます。写真が多いと時間がかかることがあります。', 'failed': '{app} で開けませんでした：{error}'},
 'renameFolder': {'eyebrow': 'フォルダー', 'button': 'フォルダー名の変更（F2）', 'title': '「{name}」の名前を変更', 'label': '新しい名前', 'next': '続ける'},
 'limbo': {'title': '保留', 'lead': '削除候補にした写真と動画は、写真の外のここで、あなたが決めるまで待ちます：削除する（確認コードを入力してごみ箱へ）か、戻すか。',
   'items': '保留中のファイル {count} 個', 'restoreAll': 'すべて写真に戻す', 'restoreTitle': '保留から出して写真に戻す',
   'send': '保留に送る', 'sendTitle': '選択した写真は写真から外れ、削除するか戻すまで保留で待ちます',
   'restoreSelected': '写真に戻す',
   'confirmOne': 'ファイル「{name}」を保留に送りますか？', 'confirmMany': '選択した {count} 個のファイルを保留に送りますか？',
   'confirmMessage': '写真から外れ、削除（ごみ箱）するか戻すまで保留で待ちます。ファイル自体には何も起きません。',
   'empty': '保留には何もありません', 'emptyHint': '写真を削除候補にすると（サムネイルのごみ箱、または 3 キー）、ここで待ちます。'},
 'convert': {
   'eyebrow': 'HEIC 写真', 'button': 'JPG/PNG に…', 'buttonTitle': '選択した HEIC 写真の JPG または PNG コピーを作成',
   'title': 'HEIC 写真 {count} 枚を変換',
   'message': '各写真の隣にフル解像度の新しいファイルを書き込みます。元の HEIC はそのままです。',
   'jpg': 'JPG：最も互換性が高い', 'jpgDetail': 'どこでも開けます（Windows、Web サイト、印刷所、古いソフト）。品質 95%：見た目の劣化はありません。',
   'png': 'PNG：ロスレス', 'pngDetail': 'すべてのピクセルがデコードしたとおり。ファイルは数倍大きくなります。',
   'note': '撮影日、カメラ、レンズ、位置（EXIF）とカラープロファイルを引き継ぐので、色は変わりません。',
   'next': '続ける'},
 'ops': {'edit': {'saved': '編集したコピーを {count} 個保存しました。', 'undone': '編集したコピー {count} 個をごみ箱に移動しました。'}, 'writeMeta': {'undone': '{count} 個のファイルを書き込み前の状態に戻しました。', 'done': '{count} 個のファイルにメタデータを書き込みました。', 'inside': '{count} 個は画像内（JPEG）。', 'sidecars': '{count} 個は横の .xmp ファイル。'}, 'renameFile': {'done': 'ファイル名を「{name}」に変更しました。'}, 'renameFolder': {'done': 'フォルダー名を「{name}」に変更しました。'},
   'convert': {'started': '写真 {count} 枚を {format} にバックグラウンドで変換中…',
   'done': '写真 {count} 枚を {format} に変換しました。'},
   'trash': {'done': '{count} ファイルをごみ箱に移動しました（{size}）。'},
   'organize': {'done': '{count} 項目を整理しました。'},
   'move': {'done': '{count} ファイルを移動しました。'},
   'undo': {'': '元に戻す', 'done': '{count} ファイルを元に戻しました。'},
   'failed': '{count} 件は変更できませんでした。',
   'clearCache': {'done': 'キャッシュを消去しました。サムネイルを作り直しています。'}},
 'confirm': {
   'bytes': {'trash': {'title': 'これら {count} ファイルが使用', 'hint': 'ごみ箱を空にするとディスク上で解放されます。'},
             'backupCopy': {'title': '{count} ファイルをコピー', 'hint': 'コピー先の空き容量は確認済みです。'}},
   'eyebrow': '確認', 'codeLabel': '確認するには、下のコードを入力してください（貼り付けはできません）：', 'inputLabel': 'コード {code} を入力',
   'pasteDisabled': 'コードを入力してください。貼り付けは無効です。', 'running': '処理中…', 'failed': '操作を完了できませんでした。',
   'more': '… ほか {count} 件', 'skipped': '{count} 項目をスキップしました（すでに所定の場所にあるか、見つかりません）。'},
 'about': {'title': 'LionPhotos について', 'version': 'バージョン {version}', 'createdBy': '作成・構想: {author}',
   'team': '© {year} LionPhotos Team', 'license': 'MIT ライセンスのオープンソース。「現状のまま」提供され、いかなる保証もありません。',
   'privacy': 'インターネットなしで動作：アカウントもテレメトリーもありません。サムネイルとメタデータはローカルファイルに保存されます。',
   'fonts': 'フォント: Plus Jakarta Sans と JetBrains Mono（SIL Open Font License）。'},
 'main': {'edit': {'suffix': '-編集', 'title': '編集したコピーを {count} 個保存', 'message': '各写真の隣に、補正・元の写真のメタデータ・LionPhotos で入力した内容を含む新しい JPEG を作成します。', 'confirm': 'コピーを保存', 'note': '元の写真は変わりません。', 'skipped': '{count} 枚の写真はここでは作成できないため除外します。', 'nothing': '保存するものはありません。', 'summary': '編集したコピーを {count} 個保存', 'undoTitle': '編集したコピー {count} 個をごみ箱に移動しますか？', 'undoMessage': '作成したコピーはごみ箱へ移動します。元の写真はそのままです。', 'toBin': 'ごみ箱へ', 'undoNothing': 'コピーが変更されたか存在しないため、元に戻すものはありません。'}, 'meta': {'undo': {'title': '{count} 個のファイルへの書き込みを元に戻す', 'message': 'ファイルはメタデータを書き込む前とまったく同じ状態に戻ります。LionPhotos で入力した内容はカタログに残ります。', 'inside': '以前の版（バイト単位で同一）', 'sidecarMade': '書き込みで作成：ごみ箱へ移動', 'sidecarBack': '以前のテキストに戻る', 'note': '現在の版はごみ箱へ移動します。', 'changed': '{count} 個のファイルは書き込み後に変更されたため、そのままにします。', 'nothing': 'ファイルは書き込み後に変更された（または存在しない）ため、元に戻すものはありません。'}, 'write': {'title': '{count} 個のファイルにメタデータを書き込む', 'message': 'LionPhotos で書いた内容（撮影者、キャプション、音声解説、場所、キーワード…）をファイルに書き込み、他のソフトでも見られるようにします。', 'inside': '画像内', 'sidecar': '横の {name}', 'confirm': 'メタデータを書き込む', 'noteInside': 'JPEG：メタデータはファイル内に書き込まれます。画像そのものは変わらず、以前の版はごみ箱に移ります。', 'noteSidecar': 'その他の形式：元のファイルには触れず、横の .xmp ファイルに書き込みます。', 'skipped': '{count} 枚は LionPhotos で書いたメタデータがないため、そのままです。', 'nothing': 'これらの写真には LionPhotos で書いたメタデータがありません。', 'tooLarge': 'メタデータが大きすぎて JPEG に入りません。', 'summary': '{count} 個のファイルにメタデータを書き込みました'}}, 
   'common': {'rootFolder': '（コレクションのフォルダー）'},
   'labels': {'errors': {'noName': '名前を入力してください。'}},
   'dialog': {'pickFolder': {'title': '写真と動画のフォルダーを開く'}},
   'plugins': {'pickTitle': 'プラグインを選択（.lionplugin）', 'fileType': 'LionPhotos プラグイン', 'destTitle': '書き出しフォルダーを作成する場所', 'errors': {'notZip': '有効なパッケージではありません。', 'tooBig': 'パッケージが大きすぎます。', 'tooManyFiles': 'パッケージのファイルが多すぎます。', 'encrypted': 'パッケージがパスワードで保護されています。', 'compression': '対応していない圧縮方式です。', 'badPath': 'パッケージ内の無効なパス：{detail}', 'unexpectedFile': 'パッケージ内の許可されていないファイル：{detail}', 'fileType': '許可されていないファイル形式：{detail}', 'manifest': 'plugin.json が不完全か無効です（{detail}）。', 'noManifest': 'パッケージに plugin.json がありません。', 'noEntry': 'パッケージにページ {detail} がありません。'}, 'install': {'title': 'プラグイン「{name}」{version} をインストール', 'message': '作成者：{author}。ページのひな形と画像が含まれ、LionPhotos の中では何も実行されません。', 'replaces': 'バージョン {version} を置き換えます（旧版はごみ箱へ）。', 'confirm': 'インストール', 'note': '信頼できる人のプラグインだけをインストールしてください。書き出したページは、開いた人のブラウザーでプラグインの JavaScript を実行します。'}, 'remove': {'title': 'プラグイン「{name}」を削除', 'message': 'プラグインのフォルダーはごみ箱に移動します。書き出し済みのページはそのまま残ります。', 'confirm': '削除'}, 'export': {'noteZip': '隣にすべてを含む .zip が作成されます。', 'title': '「{name}」で写真 {count} 枚を書き出す', 'message': '{folder} に新しいフォルダーを作成します。', 'photos': '写真 {count} 枚', 'confirm': '書き出す', 'note': '写真の縮小コピーを作成します。元の写真は変更しません。', 'noteOriginals': '元のファイルもコピーします。変更はしません。', 'nothing': '書き出すものがありません。', 'busy': 'すでに書き出しが進行中です。', 'summary': '写真 {count} 枚を {folder} に書き出し'}},
   'openWith': {'title': '開くプログラムを選択', 'programs': 'プログラム'},
   'library': {'errors': {'noFolder': 'まずフォルダーを開いてください。', 'notFolder': 'フォルダーが見つかりません: {folder}'}},
   'backup': {'errors': {'noFolder': '既存のフォルダーを選んでください。', 'same': 'マスターとバックアップが同じフォルダーです。',
     'nested': '一方のフォルダーがもう一方の中にあります。別々のフォルダーを選んでください。', 'expired': '比較結果が古くなっています。もう一度比較してください。',
     'nothing': 'コピーするものはありません。すべてそろっています。', 'noSpace': '空き容量が足りません：{need} 必要で、空きは {free} です。'}},
   'ops': {
     'errors': {'unknownOperation': '不明な操作です。', 'expired': 'この確認は期限切れです。最初からやり直してください。', 'tooManyAttempts': '誤ったコードが多すぎたため、操作を取り消しました。',
       'wrongCode': 'コードが違います。確認してもう一度入力してください。', 'tooManyFiles': '1 回の操作のファイルが多すぎます。', 'noFreeName': '移動先に使えるファイル名がありません。'},
     'trash': {'title': '{count} ファイルをごみ箱に移動しますか？',
       'message': '{count} ファイル（{size}）がごみ箱に移ります。そこから元に戻せます。',
       'confirm': 'ごみ箱に移動', 'summary': '{count} ファイルをごみ箱へ',
       'errors': {'noneSelected': '少なくとも 1 項目を選んでください。', 'allMissing': '{count} ファイルはどれももう存在しません。'}},
     'organize': {'title': '{count} 項目を日付別フォルダーに整理しますか？',
       'message': '{count} 項目をコレクション内の {folders} に移動します。',
       'folders': '{count} フォルダー', 'confirm': '整理', 'already': '{count} 項目はすでに所定のフォルダーにあります。',
       'summary': '{count} 項目を日付で整理',
       'errors': {'noneSelected': '少なくとも 1 項目を選んでください。', 'noTheme': 'フォルダーのテーマを入力してください。', 'nothingToMove': 'すべて所定の場所にあります。移動するものはありません。'}},
     'move': {'title': '{count} ファイルを移動しますか？', 'message': '{count} ファイルを {folder} に移動します。',
       'related': '同じ写真の関連ファイル {count} 個を含みます。',
       'confirm': '移動', 'summary': '{count} ファイルを {folder} に移動',
       'errors': {'noneSelected': '少なくとも 1 項目を選んでください。', 'noFolder': '移動先のフォルダーを選んでください。', 'badName': 'フォルダー名に使えない文字が含まれています。'}},
     'undo': {'title': '{count} ファイルを元に戻しますか？', 'message': '取り消し: {summary}。', 'confirm': '元に戻す',
       'errors': {'notUndoable': 'この操作はここでは元に戻せません。', 'alreadyUndone': 'この操作はすでに元に戻されています。', 'nothingToUndo': 'その後ファイルが移動または変更されたため、元に戻すものはありません。'}},
     'backupCopy': {'titleToBackup': '{count} ファイルをバックアップにコピーしますか？',
       'titleToMaster': '{count} ファイルをマスターにコピーしますか？',
       'message': '{count} ファイル（{size}）を {folder}（{folders}）にコピーします。各コピーは元ファイルと照合され（SHA-256）、ファイルが置き換えられることはありません。',
       'confirm': 'コピー', 'summary': '{count} ファイルを {folder} にコピー'},
     'renameFile': {'title': '「{from}」を「{to}」に変更しますか？', 'message': 'ディスク上のファイル名が変わります。サムネイル、評価、ラベル、顔はそのままです。元に戻せます。',
       'messageSidecars': 'ファイルとその付属ファイル {count} 個（Lightroom/DxO）の名前がディスク上で変わります。写真のサムネイル、評価、ラベル、顔はそのままです。元に戻せます。',
       'summary': 'ファイル「{from}」を「{to}」に変更',
       'errors': {'noFile': 'このファイルは開いているコレクションにありません。', 'sameName': 'ファイルはすでにこの名前です。', 'extension': '拡張子 {ext} はそのままにしてください。名前を変えてもファイルは変換されません。'}},
     'renameFolder': {'title': '「{from}」を「{to}」に変更しますか？',
       'message': 'ディスク上のフォルダー {folder} の名前が変わります。中の {count} 項目のサムネイル、評価、ラベルはそのままです。',
       'confirm': '名前の変更', 'summary': 'フォルダー「{from}」を「{to}」に変更',
       'errors': {'noFolder': 'コレクション内のフォルダーを選んでください（コレクション自体の名前は LionPhotos の外で変えます）。', 'badName': '\\ / : * ? " < > | を含まず、ピリオドや空白で終わらない名前にしてください。',
                  'sameName': 'フォルダーはすでにこの名前です。', 'exists': 'そこにはすでに「{name}」という名前のフォルダーかファイルがあります。'}},
     'convert': {'titleJpg': 'HEIC 写真 {count} 枚を JPG に変換しますか？',
       'titlePng': 'HEIC 写真 {count} 枚を PNG に変換しますか？',
       'message': '元ファイルの隣に、EXIF データとカラープロファイル付きのフル解像度の新しいファイルを {count} 個書き込みます。元ファイルは変更されません。',
       'confirm': '変換', 'summary': 'HEIC 写真 {count} 枚を {format} に変換',
       'errors': {'noneSelected': 'HEIC 写真を少なくとも 1 枚選んでください。'}},
     'clearCache': {'title': 'サムネイルのキャッシュを消去しますか？', 'message': '{thumbs}と{previews}（{size}）が消去されます。写真と動画は変更されず、サムネイルは必要に応じて作り直されます。',
       'thumbs': 'サムネイル {count} 件', 'previews': '動画プレビュー {count} 件', 'confirm': 'キャッシュを消去'}}},
}

# 1.23.0: export photos
def _merge(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict) and not set(v) <= {'one', 'other'}: _merge(a[k], v)
        else: a[k] = v
_merge(MESSAGES, {'export': {'menu': '写真を書き出す…', 'button': '写真を書き出す', 'buttonTitle': '調整とトリミングを反映した新しいファイルとして書き出します（Ctrl+E）', 'eyebrow': '書き出し', 'title': '{count} 枚の写真を書き出す', 'edited': '{count} 枚に調整またはトリミングがあります。', 'noneEdited': '調整された写真はありません。選んだ形式でそのまま書き出します。', 'skipped': '{count} 項目（動画または描画できない形式）は除外されます。', 'nothing': '書き出すものがありません。動画とここで描画できない形式は除外されます。', 'preset': 'プリセット', 'presets': {'social': 'SNS', 'socialHint': 'JPEG 90、1080 × 1350、画面用シャープ、位置情報なし', 'client': 'クライアント納品', 'clientHint': 'JPEG 95、元のサイズ、すべてのメタデータ', 'print': '印刷', 'printHint': 'TIFF、元のサイズ、印刷用シャープ、作者のみ', 'web': 'Web', 'webHint': 'JPEG 85、2048 px、画面用シャープ、位置情報なし', 'save': 'プリセットとして保存…', 'saveTitle': '新しい書き出しプリセット', 'name': '名前', 'saveConfirm': '保存', 'removeHint': '右クリック：このプリセットを削除'}, 'where': '書き出し先', 'noFolder': 'フォルダーが選ばれていません', 'chooseFolder': 'フォルダーを選ぶ…', 'subfolder': '新しいフォルダーに入れる', 'file': 'ファイル', 'format': '形式', 'formats': {'jpeg': 'JPEG', 'jpegHint': '画面、SNS、ほとんどの納品向け', 'png': 'PNG', 'pngHint': '劣化なし、ファイルは大きめ', 'tiff': 'TIFF', 'tiffHint': '劣化なし、印刷や他の編集ソフト向け（8 ビット）'}, 'quality': '画質', 'size': 'サイズ', 'longSide': '長辺のピクセル数', 'sizes': {'original': '元のサイズ', 'long': '長辺…', 'igPortrait': 'Instagram 縦（1080 × 1350）', 'story': 'ストーリーズ、リール（1080 × 1920）', 'hd': 'フル HD（1920 × 1080）', 'uhd': '4K（3840 × 2160）', 'print10x15': 'プリント 10 × 15 cm（300 dpi）', 'print13x18': 'プリント 13 × 18 cm（300 dpi）', 'print20x30': 'プリント 20 × 30 cm（300 dpi）'}, 'sharpen': '出力シャープ', 'sharpenOf': {'none': 'なし', 'screen': '画面用', 'print': '印刷用'}, 'names': 'ファイル名', 'pattern': '名前のパターン', 'patternReset': '既定', 'pieces': {'date': '撮影日（2026-07-24）', 'work': 'アルバムまたはプロジェクト', 'author': '撮影者（LionPhotos の作者、なければカメラの記録）', 'number': '書き出しの番号（001、002…）', 'name': '元のファイル名'}, 'work': 'アルバムまたはプロジェクト', 'workPlaceholder': '{álbum} に使う名前', 'ascii': 'アクセント記号なし', 'keepName': '元のファイル名のまま', 'preview': '最初のファイル名', 'noAuthorHint': '作者のない写真があります。そのファイル名には撮影者が入りません。', 'metadata': 'メタデータ', 'modes': {'all': 'すべて', 'allHint': 'カメラ、場所、作者、説明', 'noGps': '位置情報なし', 'noGpsHint': 'GPS 以外すべて：SNS 向け', 'author': '作者のみ', 'authorHint': '撮影者の名前と役職', 'none': 'なし', 'noneHint': '画像とカラープロファイルのみ'}, 'watermark': '写真に文字で署名する', 'watermarkText': '文字', 'watermarkPlaceholder': '© 撮影者の名前', 'watermarkPlace': '位置', 'opacity': '不透明度', 'places': {'bottomRight': '右下', 'bottomLeft': '左下', 'topRight': '右上', 'topLeft': '左上', 'center': '中央'}, 'next': '書き出す…', 'running': '写真を書き出しています…', 'runningN': '{total} 枚中 {done} 枚目を書き出しています…', 'done': '{count} 枚の写真を「{folder}」に書き出しました（{size}）。', 'cancelled': '書き出しを中止しました。書き出し済みの写真は残ります。', 'openFolder': 'フォルダーを開く'}, 'ops': {'export': {'undone': '書き出した写真 {count} 枚をごみ箱へ移動しました。'}}, 'main': {'dialog': {'pickExportFolder': {'title': '書き出し先のフォルダー'}}, 'export': {'title': '{count} 枚の写真を書き出す', 'message': '「{folder}」に調整とトリミングを反映した新しいファイルを作ります。元の写真は変わりません。', 'confirm': '書き出す', 'mode': {'all': 'すべてのメタデータ付き。', 'noGps': '撮影場所なし。', 'author': 'ファイルには作者のみ入ります。', 'none': 'ファイルにメタデータは入りません。'}, 'noAuthor': '{count} 枚の写真に作者がありません。', 'skipped': '{count} 項目は除外されます。', 'summary': '{count} 枚の写真を「{folder}」に書き出しました', 'undoTitle': '書き出した写真 {count} 枚をごみ箱へ移動しますか？', 'undoMessage': '書き出したファイルはごみ箱へ移動します。元の写真はそのままです。', 'undoNothing': '書き出したファイルが変更されたか見つかりません。元に戻すものはありません。', 'errors': {'noFolder': '書き出し先のフォルダーを選んでください。', 'nothing': '書き出すものがありません。', 'readOnly': 'LionPhotos は「{folder}」に書き込めません。', 'session': 'この書き出しは終了しました。もう一度始めてください。', 'full': 'ディスクがいっぱいです。'}}}})
# 1.23.0: organize renames
_merge(MESSAGES, {'organize': {'rename': 'ファイル名を変更する', 'renameHint': 'ディスク上の各写真に新しい名前を付けます。同じ写真の RAW、JPEG、.xmp は同じ名前のままです。', 'namePattern': '名前のパターン', 'work': 'アルバムまたは仕事（{álbum} 用）', 'workPlaceholder': '例：卒業式', 'nameExample': '最初の写真：', 'renameNote': 'フォルダーごとに日付順で番号を付けます。上書きはしません。元に戻すと以前の名前とフォルダーに戻ります。', 'sameHint': 'ファイルは今のフォルダーのまま、新しい名前だけが付きます。', 'rootFolder': '（コレクションのフォルダー）', 'runRename': '{count} 項目の名前を変更', 'pattern': {'same': 'フォルダーはそのまま'}}, 'main': {'ops': {'organize': {'renameMessage': '{count} 個のファイルが今のフォルダーで新しい名前になります。', 'renameAlso': 'ファイル名も変わります。'}}}})
# 1.24.0: reorganize the collection
_merge(MESSAGES, {'reorganize': {'introTitle': 'コレクション全体を整理し直す', 'introLead': 'LionPhotos が今のフォルダー構成を読み取り、ディスク上の統一した構成を提案します。イベントごとのフォルダーを年の中に、長期のテーマはまとめて、整理待ちと機材テストは別に置きます。ファイルを動かす前にすべて確認できます。', 'introSample': '2025/2025-12-24-クリスマス · テーマ/Noah · _整理待ち · _機材', 'analyze': 'コレクションを分析', 'analyzing': '分析中…', 'eyebrow': '整理し直す', 'title': '「{name}」の提案', 'summary': '{folders}にある {count} 項目を読み取りました。', 'foldersN': '{count} 個のフォルダー', 'again': 'もう一度分析', 'close': '閉じる', 'options': {'themes': {'label': '長期のテーマ', 'folder': '「テーマ/」に', 'year': '始まった年に'}, 'loose': {'label': 'ばらばらの写真', 'events': '日付でまとめる', 'inbox': '_整理待ち へ'}, 'spheres': '「個人」と「仕事」を最上位フォルダーにする'}, 'sections': {'event': 'イベント', 'theme': '長期のテーマ', 'loose': 'ばらばらの写真（日付でまとめる）', 'typed': '動画をそのイベントへ', 'inbox': '整理待ち', 'gear': '機材テスト', 'keep': 'そのまま'}, 'sectionHints': {'event': '年 / 日付-名前', 'theme': '同じ題材が数か月', 'loose': '1 日以上空くと別のグループ', 'typed': '各ファイルの日付で', 'inbox': 'フォルダー名から', 'gear': 'フォルダー名から', 'keep': 'すでに正しい場所、または写真ではない'}, 'looseFrom': '{folder} にばらばらの {count} 項目', 'destLabel': '{folder} の新しい場所', 'include': '{folder} を整理', 'photos': '写真 {count} 枚', 'videos': '動画 {count} 本', 'items': '{count} 項目', 'reasons': {'chosen': 'すでにこの構成のフォルダーにある', 'noPhotos': '写真なし', 'documents': 'ほぼ文書のみ：移動しない', 'inbox': '名前から整理待ちと判断', 'gear': '名前からテストと判断', 'eventDay': '1 日', 'eventDays': '{days} 日', 'theme': '{days} 日：長期のテーマ', 'organized': '整理済み', 'typed': 'イベントと同じ日付', 'loose': '年または月のフォルダーにばらばら', 'looseInbox': '年または月のフォルダーにばらばら'}, 'after': '整理後', 'afterHint': '整理後の「{name}」（新しいフォルダーに印）。', 'footNote': 'フォルダーは中身ごと（RAW、.xmp、文書）移動します。アルバム、人物、カテゴリーも引き継がれます。コード入力付きの 1 回の操作で、元に戻せます。', 'apply': '{count} 項目を整理（{folders}）…', 'nothing': '移動するものはありません'}, 'ops': {'reorganize': {'done': 'コレクションを整理しました：{count} 項目を移動（{folders}）。', 'folders': '{count} 個のフォルダー'}}, 'main': {'ops': {'reorganize': {'errors': {'noCollection': '先にコレクションを開いてください。', 'nothing': '移動するものはありません。すべて正しい場所にあります。', 'badName': 'フォルダー名「{name}」は使えません（Windows が受け付けない文字、または空）。'}, 'folders': 'フォルダーごと {count} 個', 'title': 'コレクションを整理し直す', 'message': '{count} 項目がディスク上で移動します：{folders}と{files}。', 'files': 'ばらばらのファイル {count} 個', 'confirm': '整理する', 'summary': 'コレクションを整理しました（{count} 件の移動）'}}}})
_merge(MESSAGES, {'main': {'ops': {'reorganize': {'dirs': {'themes': 'テーマ', 'inbox': '_整理待ち', 'gear': '_機材', 'personal': '個人', 'professional': '仕事', 'loose': 'ばらばら'}}}}})
_merge(MESSAGES, {'reorganize': {'reasons': {'subject': 'イベントを含むテーマのフォルダー：そのまま残し、中のイベントに日付を付ける'}}})
# 1.24.1: progress and stop
_merge(MESSAGES, {'confirm': {'progress': '{total} 件中 {done} 件（{percent}%）', 'stop': '停止', 'stopping': '停止しています…'}, 'ops': {'stopped': '停止しました。済んだ分はそのまま残ります（元に戻せます）。'}, 'main': {'ops': {'organize': {'mixNote': 'ファイルが名前付きの {count} 個のフォルダーから出ます。写真は同じ月の他の写真と混ざります。イベントごとのフォルダーを残すには「コレクションを整理し直す」を使ってください。'}}}})
# 1.24.2: viewer labels in the bar
_merge(MESSAGES, {'viewer': {'rawChip': 'カメラの JPEG · {size}'}, 'adjust': {'viewerChip': '補正済み'}})

# 1.24.3: albums and projects in the side bar
_merge(MESSAGES, {'sidebar': {'albumsInYear': '{year}年の写真がある{count}件のアルバム', 'projectsInYear': '{year}年の写真がある{count}件のプロジェクト'}})
# 1.25.0: album suggestions
_merge(MESSAGES, {'albumSuggest': {'button': 'アルバムを提案', 'buttonTitle': '出来事と写真の内容から提案されたアルバム（確認用）', 'eyebrow': '提案', 'title': '提案されたアルバム', 'lead': '一緒に撮った写真を出来事としてまとめ、フォルダー・写真の内容・日付・場所・写っている人から名前を付けます。必要なものを残し、名前を変更してください。ディスク上は何も変わりません。', 'again': 'もう一度提案', 'close': '閉じる', 'working': '写真を確認しています…', 'empty': '提案はありません', 'emptyHint': '写真はすでにアルバムにあるか、グループが小さすぎます。', 'footNote': 'アルバムは LionPhotos のカタログの中だけにあります。写真の場所は変わりません。', 'create': '{count} 件のアルバムを作成', 'nothing': '選択なし', 'created': '{count} 件のアルバムを作成しました。', 'nameLabel': 'アルバム名', 'include': '「{name}」を作成', 'selectAll': 'すべて選択', 'selectNone': 'すべて解除', 'more': 'さらに {count} 件表示', 'days': '{count} 日間', 'sections': {'event': '出来事', 'theme': '年をまたぐテーマ'}, 'sectionHints': {'event': '一緒に撮った写真', 'theme': '別々の日の同じテーマ'}, 'content': {'title': '写真に写っているもの', 'none': 'まだ分析していません。提案はフォルダー・場所・日付から作られます。', 'done': '{count} 件中 {done} 件を分析済み。', 'running': '分析中… {total} 件中 {done} 件', 'runningHint': '終わると提案が作り直されます。', 'hint': 'このコンピューター上で、サムネイルから行います。ファイルは変更されず、何も送信されません。', 'unsupported': 'このコンピューターには LionPhotos が使えるグラフィックカードがありません。提案はフォルダー・場所・日付から作られます。', 'start': '写真を分析', 'more': '残りを分析', 'pause': '一時停止', 'resume': '再開'}, 'reasons': {'shown': '写真の {percent}% に{theme}', 'shownTitle': 'サムネイルから読み取った写真の内容', 'words': '名前に{theme}', 'date': '日付から{theme}', 'big': 'この期間の写真が多い'}, 'names': {'folder': '{folder} {year}', 'folderOnly': '{folder} {year}', 'folderWhen': '{folder} · {when}', 'celebrationOf': '{person}の{theme} {year}', 'themeDay': '{theme} · {when}', 'holiday': '{theme} {year}', 'placeWhen': '{place} · {when}', 'themeWhen': '{theme} · {when}', 'when': '{when}', 'theme': '{theme}'}, 'themes': {'wedding': '結婚式', 'birthday': '誕生日', 'graduation': '卒業式', 'baptism': '洗礼式', 'christmas': 'クリスマス', 'newyear': '年越し', 'carnival': 'カーニバル', 'easter': 'イースター', 'baby': '赤ちゃん', 'party': 'パーティー', 'beach': 'ビーチ', 'mountain': '山', 'snow': '雪', 'lake': '湖と川', 'countryside': '田舎', 'city': '街', 'music': '音楽とライブ', 'sport': 'スポーツ', 'food': '料理', 'nature': '花と植物', 'wildlife': '動物', 'pets': '犬と猫', 'cars': '車とバイク', 'planes': '飛行機', 'trains': '電車', 'boats': '船', 'documents': '書類とスクリーンショット'}}})
# 1.25.0: related files left behind
_merge(MESSAGES, {'regroup': {'title': '取り残された関連ファイル', 'lead': '写真の移動や名前の変更で、フォルダーに一つだけ残った .xmp（Lightroom、Camera Raw）や .dop（DxO）などを、写真の隣に戻し、写真と同じ名前にします。どの写真のものかは、操作の履歴か .xmp 自体（RAW ファイル名と撮影日時）から判断します。', 'run': '探してまとめる…'}, 'ops': {'regroup': {'done': '{count} 件の関連ファイルを写真のもとに戻しました。'}}, 'main': {'ops': {'regroup': {'title': '{count} 件の関連ファイルを写真のもとに戻しますか？', 'message': 'それぞれ写真のフォルダーに移り、写真と同じ名前になります（RAW の編集内容はそのまま）。元に戻せます。', 'confirm': 'まとめる', 'summary': '{count} 件の関連ファイルを写真のもとに戻した', 'unmatched': 'ほかの {count} 件は写真を確実に特定できないため、そのままです。', 'errors': {'none': '取り残された関連ファイルはありません。.xmp と .dop はすべて写真の隣にあります。', 'noneMatched': '{count} 件の関連ファイルが取り残されていますが、写真を確実に特定できません。移動するものはありません。'}}}}})
# 1.26.0: short dates, countries and continents in album names
_merge(MESSAGES, {'albumSuggest': {'names': {'folderWhen': '{folder} {when}', 'themeDay': '{theme} {when}', 'placeWhen': '{place} {when}', 'themeWhen': '{theme} {when}', 'countryWhen': '{country} {when}', 'twoCountriesWhen': '{country}と{country2} {when}', 'continentWhen': '{continent} {when}'}, 'continents': {'africa': 'アフリカ', 'antarctica': '南極', 'asia': 'アジア', 'europe': 'ヨーロッパ', 'northAmerica': '北アメリカ', 'centralAmerica': '中央アメリカ', 'southAmerica': '南アメリカ', 'oceania': 'オセアニア'}}})
# 1.26.1: people in album names
_merge(MESSAGES, {'albumSuggest': {'names': {'celebrationOf': '{theme} · {who} {year}', 'themeDayWho': '{theme} · {who} {when}', 'themeWhenWho': '{theme} · {who} {when}', 'placeWhenWho': '{place} · {who} {when}', 'countryWhenWho': '{country} · {who} {when}', 'twoCountriesWhenWho': '{country}と{country2} · {who} {when}', 'continentWhenWho': '{continent} · {who} {when}', 'whoWhen': '{who} {when}', 'whoYear': '{who} {year}'}, 'both': '{a}と{b}', 'sections': {'person': '1年を通して写っている人'}, 'sectionHints': {'person': '1年のうち多くの月に写っている人'}, 'months': '{count}か月'}})
# 1.26.1: preview of a suggestion
_merge(MESSAGES, {'albumSuggest': {'preview': {'open': 'すべての写真を大きく表示', 'button': '写真を見る', 'toggle': 'クリック：アルバムから外す（戻す）・ダブルクリック：開く', 'zoom': '大きく開く', 'hint': '写真をクリックすると外せます', 'keepAll': 'すべて残す', 'done': '完了', 'removedCount': '{count} 枚を除外'}}})
# 1.26.2: merge two albums
_merge(MESSAGES, {'albums': {'merge': {'button': '別のアルバムと結合…', 'title': '「{name}」を結合', 'lead': '「{name}」の {count} 件は選んだアルバムに移り、「{name}」はなくなります。', 'with': '結合先', 'search': 'アルバムを検索', 'noMatch': 'その名前のアルバムはありません', 'name': '結合後のアルバム名', 'summary': '{count} 件になります。', 'summaryCommon': '{count} 件になります（{common} は両方に入っています）。', 'note': '変わるのはカタログだけで、ファイルは移動しません。選んだアルバムの説明、カバー、プロジェクトはそのまま。足りないものは「{name}」から引き継ぎます。', 'confirm': '結合', 'done': '「{from}」を「{name}」に結合しました。', 'undo': '元に戻す', 'undone': '「{from}」を元に戻しました。', 'noOther': '結合できる別のアルバムがありません。'}}})
# 1.27.0: album cards with less on them
_merge(MESSAGES, {'albums': {'more': 'その他の操作', 'editMenu': '名前と説明を編集…', 'exportMenu': '写真を書き出す…', 'sizeTitle': 'ディスク上で {size}'}})
# 1.28.0: timeline, album mosaic, duplicate
_merge(MESSAGES, {'photos': {'timeline': 'タイムライン', 'mosaicOn': 'モザイクで表示', 'mosaicOff': 'グリッドで表示', 'duplicate': '複製'}, 'ops': {'duplicate': {'done': 'コピーを作成しました（{count} 件）。', 'undone': '{count} 件のコピーをごみ箱に移動しました。'}}, 'main': {'duplicate': {'suffix': 'コピー', 'title': '{count} 件を複製', 'message': '同じフォルダーにコピーを作成します（合計 {size}）。元の調整、切り抜き、マーク、説明、アルバムも引き継ぎます。元のファイルは変わりません。', 'sidecars': '写真に付属する .xmp / .dop ファイル {count} 件も、同じ新しい名前でコピーします。', 'note': '元に戻せます：コピーはごみ箱に移動します。', 'skipped': '{count} 件はディスク上に見つからないため除外します。', 'confirm': '複製', 'nothing': '複製するものがありません：ファイルが見つかりません。', 'summary': '{count} 件を複製', 'undoTitle': '{count} 件のコピーをごみ箱に移動しますか？', 'undoMessage': '複製で作ったコピーをごみ箱に移動します。元のファイルはそのままです。', 'undoNothing': 'コピーが変更されたか見つかりません：元に戻すものはありません。'}}})
# 1.28.1: change an album's cover
_merge(MESSAGES, {'albums': {'cover': {'menu': 'カバーを変更…', 'title': '「{name}」のカバー', 'lead': '{count} 枚の写真からカバーを選んでください（ダブルクリックで決定）。', 'none': 'このアルバムにはカバーに使えるサムネイル付きの写真がありません。', 'auto': '最初の写真', 'autoTitle': 'カバーをアルバムの最初の写真に戻します', 'done': '「{name}」のカバーを変更しました。'}}})
# 1.28.1: find an album by name
_merge(MESSAGES, {'albums': {'searchPlaceholder': '名前でアルバムを検索', 'searchNone': 'その名前のアルバムはありません。下で新しく作成できます。'}})
# 1.29.0: places from the photos
_merge(MESSAGES, {'places': {'fromPhotos': '写真から', 'fromPhotosHint': '各写真から読み取りました：LionPhotos またはファイルに書かれた場所（市区町村・州・国）、なければ GPS の位置（このコンピューター上で処理）。変更するには写真の場所を変更してください（説明 › 場所）。', 'yours': '自分で作成', 'noCountry': '国が不明', 'fromPhoto': '写真から', 'fromPhotoTitle': '写真の場所または GPS から読み取り：変更するには写真を変更', 'howTo': '場所は写真の GPS と場所（市区町村、国）から自動で表示されます。上で作成して、フォルダーや選択した写真に「ラベル…」を使うこともできます。'}})
# 1.30.0: the catalog kept with the collection
_merge(MESSAGES, {'portable': {'title': 'コレクションと一緒のカタログ', 'lead': 'アルバム、プロジェクト、人物と顔、場所、カテゴリ、マーク、説明、調整、切り抜きは、コレクションの隠しフォルダー「.lionphotos」にも保存されます。別のコンピューターや、別のドライブ文字で接続したこのドライブでも、すべてそのまま開けます。', 'switch': 'コレクションに保存', 'switchTitle': 'オフ：カタログはこのコンピューターだけに保存', 'off': 'このコンピューターだけに保存しています。', 'saved': 'コレクションのフォルダーは最新です（{when}、{size}）。', 'read': 'コレクションのフォルダーから読み込みました（{when}、「{by}」で保存）。', 'readOnly': 'コレクションのフォルダーに書き込めません（読み取り専用）。カタログはこのコンピューターに残ります。', 'full': 'ドライブがいっぱいでカタログを書き込めませんでした。', 'newer': 'このコレクションのカタログは新しいバージョンの LionPhotos で書かれています。読むには LionPhotos を更新してください。上書きはしていません。', 'error': 'カタログをコレクションに書き込めませんでした：{error}', 'pending': '書き込み待ちの変更があります…', 'pendingShort': '変更待ち', 'waiting': '次の変更のあとフォルダーに書き込みます。', 'saveNow': '今すぐ保存', 'reveal': 'フォルダーを表示', 'imported': 'このコレクションのカタログをフォルダーから読み込みました（{when}、「{by}」で保存）。', 'importedKept': 'このコレクションのカタログをフォルダーから読み込みました（{when}、「{by}」で保存）。このコンピューターの未保存の変更は .lionphotos/conflicts に残しました。'}})
# 1.31.0: the places on a world map
_merge(MESSAGES, {'places': {'map': {'open': '地図で見る', 'openTitle': '場所を世界地図で開く', 'countries': '{count} か国', 'mode': '地図', 'label': '写真の場所の世界地図', 'zoomIn': '拡大', 'zoomOut': '縮小', 'fit': 'すべての場所を表示', 'credit': '国境：Natural Earth・都市：GeoNames・このコンピューターで描画', 'group': '{count} か所・{items}', 'more': 'ほか {count} 件', 'shown': '地図上に {count} か所。', 'none': '位置のある場所はまだありません。場所は写真の GPS と場所情報から作られます。', 'unplaced': '{count} か所は位置が不明です。', 'manual': '自分で作成した {count} か所には位置がなく、地図には表示されません。'}}})

# 1.32.0: highlights — the photos marked great or OK
_merge(MESSAGES, {'showcase': {'mode': 'ハイライト', 'open': '選んだ写真を見る', 'openTitle': '{name} の星または OK の写真を開く', 'of': '全 {count} 件', 'prev': '前の選んだ写真', 'next': '次の選んだ写真', 'empty': 'まだ選ばれた写真はありません', 'howTo': 'よい写真に星（1）または OK（2）を付けると、その写真が入っているアルバム、人物、ペット、プロジェクトがここに、選んだ写真と一緒に表示されます。', 'lead': '星または OK の写真がある {count} 件。新しい順。'}, 'marks': {'picks': '星と OK'}})
_merge(MESSAGES, {'showcase': {'alsoIn': 'こちらにも'}})

# 1.34.0: highlights inside a label
_merge(MESSAGES, {'photos': {'spotOn': 'ハイライト：星または OK の写真だけを大きく', 'spotOff': 'すべての写真に戻る'}, 'showcase': {'photoEmpty': 'ここには星または OK の写真がありません', 'photoHowTo': 'よい写真に星（1）または OK（2）を付けると、ここに大きく順番に表示されます。', 'photoOpen': '開く', 'photoLead': '星または OK の写真 {count} 枚。'}})

# 1.35.0: raw development (16 bits)
_merge(MESSAGES, {'adjust': {'raw': {'noteOff': 'RAW 写真：調整はカメラがファイル内に保存した JPEG（8 ビット）に対して行われ、RAW データには行われません。元のファイルは変わりません。', 'noteOn': 'RAW 現像：調整はセンサーデータに対して行われ、このコンピューターで 16 ビットで現像されます。元のファイルは変わりません。', 'switch': '16 ビットの RAW データで編集（現像モード）', 'hint': 'カメラのホワイトバランスを起点に、ハイライトとシャドウをより大きく戻せます。現像した写真は開くのに約 1 秒、書き出しに数秒かかります。', 'noGpu': 'グラフィックカード（WebGL 2）が必要ですが、ここでは使えません。', 'developing': 'RAW を現像しています…', 'failed': 'RAW を現像できませんでした：{error}'}}, 'viewer': {'rawDeveloped': '16 ビットで現像', 'rawDevelopedTitle': 'センサーデータから描画し、このコンピューターで 16 ビットで現像しています（LibRaw）。比較（Y）でカメラの JPEG と比べられます。'}})

# 1.36.0: the search of the title bar
_merge(MESSAGES, {'gs': {'placeholder': '{folder} を検索 — 写真、撮影者、場所、アルバム…', 'label': 'コレクション全体を検索（Ctrl+K）', 'hint': 'ファイル名、撮影者、カメラ、場所、アルバム、プロジェクト、人物、ペット、キーワード、説明で検索できます。', 'keys': '↑ ↓ 選択・Enter で開く・Esc で閉じる', 'openFolder': '別のフォルダーを開く', 'noPhotos': '「{q}」を含む写真はありません', 'empty': '写真なし', 'allPhotos': '「{q}」を含む写真 {count} 枚をすべて「写真」で見る', 'group': {'photos': '写真', 'album': 'アルバム', 'project': 'プロジェクト', 'person': '人物', 'pet': 'ペット', 'place': '場所', 'authors': '撮影者', 'cameras': 'カメラ', 'keywords': 'キーワード', 'folders': 'フォルダー'}}})

# 1.36.0: why nothing is shown
_merge(MESSAGES, {'photos': {'why': {'query': '検索「{q}」が有効です', 'year': '{year} 年のみ', 'videos': '動画のみ', 'images': '写真のみ', 'mark': 'マーク「{mark}」のみ', 'category': 'カテゴリ「{name}」のみ', 'sphere': '「{name}」のみ（タイトルバー）', 'noAlbum': 'アルバムに入っていない写真のみ', 'thisFolder': 'このフォルダーのみ（サブフォルダーを除く）', 'titleIn': '「{name}」にはフィルターに合う項目がありません', 'hiddenIn': '{count} 項目ありますが、下のフィルターで隠れています。', 'hidden': 'ここには {count} 項目ありますが、下のフィルターで隠れています。', 'without': '外すと：{count} 項目', 'remove': '外す', 'removeAll': 'すべてのフィルターを外す'}}})

# 1.36.0: albums in an even grid
_merge(MESSAGES, {'albums': {'modeMosaic': 'モザイク', 'modeEven': '均等グリッド'}})
_merge(MESSAGES, {'photos': {'clearSearch': '検索をクリア'}})
# 1.37.0: lens correction (Lensfun profiles)
_merge(MESSAGES, {'adjust': {'group': {'lens': 'レンズ'}, 'lensDist': '歪曲', 'lensVig': '周辺減光', 'lensCa': '色収差'}, 'lens': {'summary': 'レンズ補正済み', 'switch': 'レンズを補正', 'choose': 'プロファイルを選択…', 'hint': 'レンズのプロファイル (Lensfun) で、歪曲・周辺減光・色収差を補正します。ファイルは変更されません。', 'hintOn': 'スライダー: 0 は測定どおり、+ で強く、− で弱く。プロファイルがない場合は手動で補正: + で樽型を直し、隅を明るくします。', 'noGpu': 'グラフィックカード (WebGL) が必要ですが、ここでは使えません。', 'failed': 'レンズを補正できませんでした: {error}', 'sensor': 'センサー {crop}×', 'noProfileFor': '「{lens}」のプロファイルがありません。スライダーで補正するか、プロファイルを選んでください。', 'noProfile': '写真にレンズの情報がありません。スライダーで補正するか、プロファイルを選んでください。', 'manyProfiles': '{total} 枚中 {count} 枚にプロファイルあり', 'distortion': '歪曲', 'vignetting': '周辺減光', 'fringes': '色収差', 'searchPlaceholder': '名前・メーカー・マウントで検索 (例: RF 16、Sigma 150-600、Nikon Z)', 'search': 'レンズプロファイルを検索', 'profiles': 'レンズプロファイル', 'none': 'なし — 手動で補正', 'noneDetail': 'スライダーで補正します', 'fits': '同じ焦点距離', 'more': '{count} 件中 最初の {shown} 件: さらに入力して絞り込み', 'use': 'このプロファイルを使う', 'correction': 'レンズ補正', 'pickTitle': 'レンズプロファイルを選択', 'cameraSays': 'カメラの記録: {lens}', 'credit': 'Lensfun (lensfun.github.io) の {count} 件のレンズプロファイル、CC BY-SA 3.0。', 'found': '{count} 件のプロファイル', 'forMany': '{count} 枚の写真'}})
# 1.37.0: lens corrections by hand
_merge(MESSAGES, {'adjust': {'manDist': '歪曲', 'manVert': '垂直', 'manHorz': '水平', 'manScale': '拡大・縮小', 'manVig': '四隅', 'manMid': '中心点', 'manCaR': 'レッド/シアン', 'manCaB': 'ブルー/イエロー', 'lensDist': 'プロファイルの歪曲', 'lensVig': 'プロファイルの周辺減光', 'lensCa': 'プロファイルの色収差'}, 'lens': {'switch': 'レンズプロファイルで補正', 'hintOn': 'プロファイルのスライダー: 0 は測定どおり、+ で強く、− で弱く。', 'manual': '補正', 'manualReset': 'リセット', 'manualHint': 'プロファイルの有無にかかわらず使えます。+ で樽型を直し、上または右を広げ、四隅を明るくします。スライダーをダブルクリックで 0 に戻ります。', 'geometry': 'ジオメトリ', 'corners': '四隅', 'fringesTitle': '色収差', 'noProfileFor': '「{lens}」のプロファイルがありません。下の手動補正を使うか、プロファイルを選んでください。', 'noProfile': '写真にレンズの情報がありません。下の手動補正を使うか、プロファイルを選んでください。'}})
_merge(MESSAGES, {'adjust': {'manVig': '適用量'}})
# 1.37.0: .xmp alongside JPEG too
_merge(MESSAGES, {'main': {'meta': {'write': {'both': '画像の中と、隣の {name}', 'noteInside': 'JPEG: メタデータをファイル内に書き込み、写真を送るときに一緒に届くようにします（画像そのものは変わらず、以前の版はごみ箱へ）。隣の .xmp ファイルにも書き込みます。'}}}})
# recovery copy (1.37.1)
_merge(MESSAGES, {'describe': {'safeCollection': '入力と同時に保存: カタログに保存し、コレクションのフォルダー (.lionphotos) にも復元用コピーを自動で書き込みます。写真のファイルは、書き込みを指示したときだけ変わります。', 'safeLocal': '入力と同時に、このコンピューターのカタログに保存します。写真のファイルは、書き込みを指示したときだけ変わります。', 'safeWhen': '復元用コピーの書き込み: {when}', 'notInFile': 'まだファイルにない項目: {count}', 'inFile': 'ファイルにはすでにこのデータがあります。', 'writeHint': 'このメタデータと印（レーティングとして）をファイルに書き込みます（他のソフトや送信用）。JPEG には内部と隣の .xmp に、その他の形式は隣の .xmp に'}, 'main': {'meta': {'write': {'message': 'これまでこの変更はカタログ（と復元用コピー）にだけありました。これからメタデータ（作者、キャプション、音声説明、場所、キーワードなど）と印（レーティング）をファイル自体に書き込みます。他のソフトや送信用です。'}}}})
# 1.38.0: Watermelon and City blue
_merge(MESSAGES, {'statusbar': {'themeTeal': 'スイカ', 'themeTealTitle': 'スイカ テーマ — ロゴのティール、ピンク、白', 'themeCity': 'シティブルー', 'themeCityTitle': 'シティブルー テーマ — 都市計画図のようなコバルト、コーラル、白'}})

# 1.39.0: new versions, only when asked (the version in the bottom-right corner)
_merge(MESSAGES, {'update': {'status': {'title': 'LionPhotos のバージョン — クリックして新しいバージョンを確認', 'checking': '新しいバージョンを確認しています…', 'currentTitle': '最新バージョンを使用しています。クリックで詳細を表示。', 'errorTitle': '新しいバージョンを確認できませんでした。クリックして再試行。', 'available': '新バージョン {version}', 'availableTitle': 'バージョン {version} が利用できます。クリックして更新。'}, 'dialog': {'installed': 'インストール済みのバージョン', 'newVersion': '新しいバージョン', 'availableTitle': '新しいバージョンがあります', 'howInstaller': 'LionPhotos を閉じ、インストーラーが新しいバージョンをダウンロード・検証・インストールして、もう一度開きます。設定とカタログは保持されます。', 'howScript': 'LionPhotos を閉じ、インストーラー（PowerShell）が新しいバージョンをダウンロード・検証・インストールします。設定とカタログは保持されます。', 'howDownload': '新しいバージョンのダウンロード ページがブラウザーで開きます。お使いのシステム用のインストーラーをダウンロードして開いてください。設定とカタログは保持されます。', 'question': '今すぐ更新しますか？', 'whatsNew': 'このバージョンの新機能を見る', 'updateNow': '今すぐ更新', 'openDownload': 'ダウンロード ページを開く', 'notNow': '後で', 'checking': '新しいバージョンを確認しています…', 'currentTitle': 'LionPhotos は最新です', 'currentText': '最新バージョンを使用しています。', 'errorTitle': '確認できませんでした', 'errorText': 'インターネット接続を確認して、もう一度お試しください。', 'checkAgain': 'もう一度確認', 'closing': '更新のため LionPhotos を閉じています…', 'howDmg': '新しいバージョン（.dmg）が「ダウンロード」フォルダーにダウンロード・検証されて開き、LionPhotos は閉じます。LionPhotos を「アプリケーション」にドラッグし、「置き換える」を選んでください。設定とカタログは保持されます。', 'howSh': 'LionPhotos を閉じ、インストーラー（install.sh）が新しいバージョンをダウンロード・検証・インストールして、もう一度開きます。設定とカタログは保持されます。', 'howAppImage': '新しい AppImage をダウンロード・検証し、現在のものと置き換えて開きます。設定とカタログは保持されます。', 'howDeb': '新しいパッケージ（.deb）が「ダウンロード」フォルダーにダウンロード・検証され、システムのソフトウェア インストーラーで開きます（パスワードを求められます）。その後 LionPhotos をもう一度開いてください。設定とカタログは保持されます。', 'howRpm': '新しいパッケージ（.rpm）が「ダウンロード」フォルダーにダウンロード・検証され、システムのソフトウェア インストーラーで開きます（パスワードを求められます）。その後 LionPhotos をもう一度開いてください。設定とカタログは保持されます。', 'downloading': '新しいバージョンをダウンロードして検証しています…', 'progress': '{name}：{done} / {total}', 'progressNoTotal': '{name}：{done}', 'preparing': '新しいバージョンのファイルを取得しています…', 'closingDmg': 'LionPhotos を閉じています：開いたウインドウで「アプリケーション」にドラッグし、「置き換える」を選んでください。', 'privacy': 'LionPhotos がインターネットに接続するのは、このウインドウを開いたときだけです。GitHub で公開されているバージョンの小さなファイルを読み取ります。更新では、お使いのシステム用のインストーラーをダウンロードし、使用前に検証（SHA-256）します。あなたや写真に関するデータは送信されません。'}, 'failed': '更新を開始できませんでした: {error}', 'downloadOpened': 'ダウンロード ページをブラウザーで開きました。', 'packageOpened': '新しいバージョンをシステムのインストーラーで開きました。インストールしてから LionPhotos をもう一度開いてください。', 'saved': '新しいバージョンは {file} にあります。開いてインストールしてください。', 'error': {'checksum': 'ダウンロードしたファイルが公開されたチェックサムと一致しなかったため、破棄しました', 'network': 'GitHub に接続できません — インターネット接続を確認してください'}}})

# 1.40.0: the panel by task (tabs, two panels in a wide viewer)
_merge(MESSAGES, {'panel': {'tab': {'adjust': '調整', 'describe': '説明', 'info': '情報'}, 'tabs': 'パネルの表示内容', 'describeInfo': '説明と情報', 'oneTitle': '1 つのパネル（調整・説明・情報をタブで切り替え）', 'twoTitle': '2 つのパネル：左に説明と情報、右に調整', 'resize': 'ドラッグしてパネルの幅を変更（ダブルクリック：既定の幅に戻す）'}, 'describe': {'safeShort': 'カタログに保存済み'}})

_merge(MESSAGES, {'viewer': {'editTitle': '編集パネルを表示または折りたたむ：カテゴリ、アルバム、補正、説明、作者と場所（H）'}})

# 1.40.1: all the photos of the day
_merge(MESSAGES, {'info': {'dayAll': 'この日の写真をすべて見る', 'dayTitle': 'ここを離れ、{day} の写真とビデオをすべて「写真」に表示します'}, 'photos': {'clearDay': 'すべての日を表示', 'why': {'day': '{day} の写真のみ'}}})

_merge(MESSAGES, {'info': {'dayAll': 'この日の写真'}})

# 1.41.0
_merge(MESSAGES, {'intro': {'help': 'このページの使い方', 'gotIt': 'わかりました'}})

_merge(MESSAGES, {'adjust': {'holdOriginal': '押している間は元の写真を表示'}, 'labels': {'emptyFind': {'person': 'このコンピューター上で、LionPhotos に写真の中の人物を探させましょう。', 'pet': 'このコンピューター上で、LionPhotos に写真の中のペットを探させましょう。'}, 'emptyOr': 'または、上の欄で手動で作成します。'}})

_merge(MESSAGES, {'reorganize': {'reasons': {'backup': 'コピー：名前から判断（{count} 枚中 {twins} 枚が他の場所にもあります）— そのまま', 'copies': 'コピー：{count} 枚中 {twins} 枚が他のフォルダーにもあります — そのまま'}, 'seeDuplicates': '重複ファイルを見る'}})

_merge(MESSAGES, {'keys': {'title': 'キーボードショートカット', 'search': 'コレクション全体を検索', 'open': 'フォルダーを開く', 'refresh': '新しいファイルと変更されたファイルを探す', 'views': '写真 · アルバム · リンボ', 'sidebar': 'サイドバー · 写真のみ', 'undo': '元に戻す · やり直す', 'back': 'アルバムから戻る · コレクション全体', 'this': 'この一覧', 'marks': '最高 · OK · 削除候補 · マークを消す', 'select': '開く · すべて選択 · 選択解除', 'files': '名前の変更 · 複製 · 書き出し', 'compare': '並べて比較', 'tabs': '調整 · 説明 · 情報（もう一度：閉じる）', 'hide': 'パネルの表示／非表示', 'nav': '前 · 次 · 最初 · 最後', 'zoom': '全体表示 ↔ 実寸 · 拡大 · 縮小', 'edit': '切り抜き · 前後比較 · 押している間は元の写真', 'show': 'スライドショー · 全画面 · アルバムに追加', 'viewerMore': '次の写真と比較 · 書き出し', 'limbo': 'リンボへ送る', 'close': '閉じる', 'button': 'キーボードショートカット (?)', 'group': {'everywhere': 'どの画面でも', 'photos': '写真', 'panel': 'サイドパネル', 'viewer': 'ビューアー'}}, 'compare': {'title': '並べて比較', 'hint': '← → で印のある側の写真を変更 · Tab で側を切り替え · 1 2 3 でマーク · ホイールで両方を拡大', 'left': '左の写真', 'right': '右の写真', 'prev': '前の写真', 'next': '次の写真', 'menu': '並べて比較', 'viewerTitle': '次の写真と比較'}})

_merge(MESSAGES, {'export': {'more': '詳細オプション', 'less': 'オプションを閉じる'}})

_merge(MESSAGES, {'backup': {'catalog': {'current': 'カタログ（アルバム、人物、マーク、説明、調整）もバックアップにあります（{when} 時点）。', 'older': 'バックアップにあるカタログのコピーは古いものです（{when}）。それ以降のアルバム、人物、調整は含まれていません。', 'missing': 'バックアップにカタログのコピーがありません。写真はありますが、アルバム、人物、説明、調整はありません。', 'copy': 'カタログをバックアップにコピー', 'copied': 'カタログをバックアップにコピーしました。'}}, 'portable': {'locked': '{by} で開かれています（{when} から）。向こうで閉じるまで、ここからコレクションのフォルダーには何も書き込みません。ここでの作業はこのコンピューターのカタログに残り、後でフォルダーに書き込まれます。', 'takeOver': 'それでもここで使う', 'takeOverTitle': 'このコンピューターからコレクションのフォルダーに書き込みます。もう一方で LionPhotos が本当に開いていない場合のみ。', 'lockedToast': 'このコレクションは別のコンピューター（{by}）で開かれています。向こうで閉じるまで、ここでの作業はこのコンピューターのカタログに残ります。'}})

_merge(MESSAGES, {'albums': {'setAsCover': 'アルバムの表紙にする'}})

_merge(MESSAGES, {'about': {'short': '情報'}})

_merge(MESSAGES, {'sidebar': {'hide': 'ナビゲーションを隠す ({key})', 'show': 'ナビゲーションを表示 ({key})'}})

_merge(MESSAGES, {'plugins': {'which': {'label': '書き出す写真', 'all': 'すべて', 'good': '優良と OK', 'great': '優良のみ'}, 'view': {'ofTotal': '{total}中 {n}', 'noneWhich': 'このマークの写真はありません', 'preview': 'プレビュー', 'previewTitle': '書き出される写真を見る', 'open': '開く', 'openTitle': '「{name}」を写真で開いて確認・変更します。戻るでこのページに戻ります。'}, 'preview': {'count': '書き出し: {total} 中 {n}', 'more': 'ほか {n}', 'cover': '表紙'}}})

_merge(MESSAGES, {'plugins': {'same': {'title': {'one': '同じ名前の写真が {count} 組あります', 'other': '同じ名前の写真が {count} 組あります'}, 'text': 'ページでは 1 つの名前で 2 枚の写真になります。それぞれどちらを書き出すか選んでください。もう一方は今回の書き出しから外れます。', 'raw': 'RAW: JPG に変換して書き出し', 'continue': '続ける'}}})

_merge(MESSAGES, {'places': {'sphereEmpty': '「{sphere}」には場所のあるファイルがありません。', 'sphereTable': '各カテゴリの場所', 'sphereFiles': {'one': '場所のあるファイル {count} 件', 'other': '場所のあるファイル {count} 件'}, 'spherePlaces': {'one': '場所 {count} 件', 'other': '場所 {count} 件'}, 'sphereShow': '表示', 'sphereHere': '表示中'}})

_merge(MESSAGES, {'sidebar': {'otherFolders': '以前に開いた他のフォルダー'}, 'showcase': {'albumsNoPicks': 'これらのアルバムには、まだスターや OK の付いた写真がないため、ハイライトはありません。アルバムはモザイクと同じように表示されます。良い写真に印（1 または 2）を付けると、ここに表示されます。'}})

_merge(MESSAGES, {'showcase': {'modeTitle': 'ハイライト: スターまたは OK の付いた写真があるものだけ', 'only': 'ハイライトには、スターまたは OK の付いた写真があるものだけが表示されます: {total} 件中 {shown} 件、新しい順。', 'all': 'すべて表示', 'albumsNoPicks': 'これらのアルバムには、まだスターや OK の付いた写真がありません。ハイライトには、スターまたは OK の付いた写真があるアルバムだけが表示されるため、今はモザイクと同じように表示しています。良い写真に印（1 または 2）を付けると、ここに表示されます。'}})

_merge(MESSAGES, {'statusbar': {'eta': {'estimating': '残り時間を計算中…', 'lessMinute': '残り 1 分未満', 'minutes': {'one': '残り約 1 分', 'other': '残り約 {count} 分'}, 'hours': {'one': '残り約 1 時間', 'other': '残り約 {count} 時間'}, 'hoursMinutes': '残り約 {hours} 時間 {minutes} 分'}}})

_merge(MESSAGES, {'statusbar': {'thumbsKept': 'サムネイルはカタログに保存され、作り直されません: {kept} 件は作成済みで、足りない {missing} 件だけを作成中です。'}})

_merge(MESSAGES, {'dupes': {'etaStep': 'このステップは{eta}'}})

_merge(MESSAGES, {'trashlog': {'byRoot': 'ルートフォルダー別', 'byRootHint': 'ドライブやフォルダーごとに送った量と、その合計。クリックすると、下にそのフォルダーだけを表示します。', 'rootAll': 'すべてのルートフォルダー', 'rootUnknown': '記録されていないルートフォルダー', 'col': {'root': 'ルートフォルダー', 'sent': 'ごみ箱に送った量', 'limbo': 'リンボで空いた容量', 'dups': '重複ファイル'}}})

_merge(MESSAGES, {'overview': {'cache': 'LionPhotos が使っている容量', 'cacheHint': 'サムネイルとプレビューは一度だけ作られ、カタログに保存されます。ファイルが変わったときだけ作り直します。写真そのものは含みません。', 'space': {'thumbsTotal': 'サムネイルとプレビュー', 'fileTotal': 'このコンピューター上のカタログファイル', 'photoThumbs': '写真のサムネイル', 'videoThumbs': '動画のサムネイル', 'adjusted': '補正した写真のサムネイル', 'byRoot': 'ルートフォルダー別', 'rootTotal': '合計', 'portable': '.lionphotos', 'portableTitle': '写真と一緒に保存されたカタログ。各ルートフォルダーの隠しフォルダー .lionphotos にあります（ドライブが接続されていないときは —）'}}, 'settings': {'space': '使用容量', 'spaceLoading': '計測中…', 'spaceLine': 'サムネイルとプレビュー: {thumbs} · カタログファイル: {file}', 'spaceDetails': '詳細'}})

_merge(MESSAGES, {'places': {'noCity': {'one': '都市のない項目 {count} 件', 'other': '都市のない項目 {count} 件'}, 'noCityTitle': '国はわかるが都市がわからない写真です（オフラインの一覧にある町から遠い GPS、またはファイルに国だけ）。ボタンでその国のすべての写真を表示します。'}})

_merge(MESSAGES, {'dupes': {'showAll': 'すべてのコピーを表示'}})

_merge(MESSAGES, {'albumSuggest': {'scanning': {'one': 'フォルダーを読み込み中です。この提案は、これまでに読み込んだ {count} 件のファイルに基づいています。終わったらもう一度提案すると、すべてを使います。', 'other': 'フォルダーを読み込み中です。この提案は、これまでに読み込んだ {count} 件のファイル（とこのコンピューターがすでに知っていた情報）に基づいています。終わったらもう一度提案すると、すべてを使います。'}}})

_merge(MESSAGES, {'views': {'todo': '編集待ち'}, 'keys': {'todo': '編集待ち'}, 'todo': {'lead': '表紙に鉛筆マークを付けたアルバムとプロジェクトを、作業する順に並べます。いちばん上が最初です。ドラッグ（または矢印）で順番を変え、「完了」で鉛筆を外します。変わるのはカタログだけです。', 'listLabel': '編集待ち（順番）', 'count': {'one': '編集待ち {count} 件', 'other': '編集待ち {count} 件'}, 'keys': 'ドラッグで並べ替え · 行で Alt+↑ ↓ を押すと移動', 'empty': '編集待ちはありません', 'howTo': 'アルバムやプロジェクトの表紙の鉛筆（または ⋯ メニューの「編集待ちにする」）をクリックすると、ここに追加されます。最初にやることを一番上にしましょう。', 'rowLabel': '{total} 件中 {n} 番目: {type} {name}', 'toTop': '一番上へ', 'up': '上へ', 'down': '下へ', 'toBottom': '一番下へ', 'done': '完了', 'doneTitle': '完了: 鉛筆を外します（このリストから外れます）', 'dragTitle': 'ドラッグして順番を変更', 'moved': '{name} は {n} 番目になりました', 'due': '期限 {date}', 'dueLate': '{date} から遅れています', 'added': '「{name}」を編集待ちの {n} 番目に追加しました。', 'see': 'リストを見る', 'removed': '「{name}」を編集待ちから外しました。', 'undo': '元に戻す', 'pinTitle': '編集待ちにする（鉛筆）', 'pinOnTitle': '編集待ち — リストの {n} 番目。クリックで鉛筆を外す', 'menuOn': '編集待ちにする', 'menuOff': '編集待ちから外す'}})

_merge(MESSAGES, {'brand': {'title': '名前とロゴ', 'lead': 'タイトルバーとスタート画面に、独自の名前とロゴ（事務所、スタジオ、講座など）を表示します。このコンピューターに保存されます。', 'preview': 'タイトルバーのプレビュー', 'name': '名前', 'logo': 'ロゴ', 'logoPreview': 'ロゴ', 'logoPick': '画像を選択…', 'logoDefault': 'LionPhotos のロゴを使う', 'logoHint': 'PNG、JPG、WebP、SVG。正方形の中に全体が収まり、周りは透明になります。', 'poweredNote': '独自の名前にすると、タイトルバーとウィンドウのタイトルに「Powered by LionPhotos」が並んで表示されます。「情報」には LionPhotos のクレジットがそのまま残ります。', 'defaultNote': '名前を空欄（または LionPhotos）にすると LionPhotos のままです。ロゴだけを変えることもできます。', 'save': '保存', 'reset': 'LionPhotos に戻す', 'change': '変更…', 'saved': '「{name}」として表示されます。', 'restored': 'LionPhotos の名前とロゴに戻しました。', 'badFile': 'このファイルはロゴに使える画像ではありません（PNG、JPG、WebP、GIF、SVG、15 MB まで）。'}})

_merge(MESSAGES, {'update': {'dialog': {'howSetup': '新しいバージョンのセットアップ（約 150 MB、アプリ全体）をダウンロードして確認します。その後 LionPhotos が閉じ、セットアップが新しいバージョンをインストールして再び開きます。設定とカタログはそのまま残ります。'}}})

_merge(MESSAGES, {'similar': {'link': '似ている写真', 'linkTitle': 'この日の似ている写真をまとめ、各連続写真のベストを残します', 'menu': 'この日の似ている写真', 'title': '似ている写真 · {day}', 'levelLabel': '似ている度合い', 'prevDay': '前の日', 'nextDay': '次の日', 'level': {'same': 'ほぼ同じ', 'sameTitle': 'ほとんど同一の写真だけ', 'similar': '似ている', 'similarTitle': '同じ写真のバリエーション（おすすめ）', 'scene': '同じ場面', 'sceneTitle': '同じ瞬間を別の角度から撮ったものも含む'}, 'reading': 'この日の写真を比較しています…', 'progress': 'サムネイル {total} 枚中 {done} 枚', 'photos': {'one': '{count} 枚', 'other': '{count} 枚'}, 'groups': {'one': '{count} グループ', 'other': '{count} グループ'}, 'noThumb': {'one': '{count} 枚はまだサムネイルなし', 'other': '{count} 枚はまだサムネイルなし'}, 'send': {'one': '{count} 枚を「保留」へ送る', 'other': '{count} 枚を「保留」へ送る'}, 'sendNone': '送るものはありません', 'footNote': '残す {keep} · 「保留」へ {go}', 'withTwins': {'one': '（同じ写真の RAW または JPG +{count}）', 'other': '（同じ写真の RAW または JPG +{count}）'}, 'none': 'この日に似ている写真はありません', 'noneTry': '「同じ場面」にすると、同じ瞬間を別の角度から撮った写真もまとめます。', 'noneScene': 'この日の写真はどれも十分に異なっています。', 'tryScene': '「同じ場面」を試す', 'lead': '各グループには、実質的に同じ写真がまとめられています。残す候補は枠で示され、それ以外は「保留」に送る設定です。写真をクリックすると残す／送るを切り替え、ダブルクリックで比較します。', 'groupLabel': 'グループ {n}、{count} 枚', 'group': 'グループ {n}', 'keeps': {'one': '{count} 枚を残す', 'other': '{count} 枚を残す'}, 'compareTitle': 'これらの写真を並べて比較', 'compare': '比較', 'keepAll': 'すべて残す', 'keepBest': '候補だけ残す', 'tileOut': '「保留」へ', 'tileKeep': '残す', 'tileHint': 'クリックで切り替え、ダブルクリックで比較', 'bestTitle': '候補：最もシャープで露出の良いもの（または印を付けたもの）', 'best': 'ベスト', 'confirmTitle': {'one': '似ている写真 {count} 枚を「保留」へ送りますか？', 'other': '似ている写真 {count} 枚を「保留」へ送りますか？'}, 'confirmMessage': '写真から外れて「保留」で待機し、いつでも戻せます。ファイルは削除されません。', 'sent': {'one': '似ている写真 {count} 枚を「保留」へ送りました。', 'other': '似ている写真 {count} 枚を「保留」へ送りました。'}, 'undo': '元に戻す'}, 'limbo': {'twins': {'one': '同じ写真の RAW または JPG も送る（{count} ファイル）', 'other': '同じ写真の RAW または JPG も送る（{count} ファイル）'}}})

_merge(MESSAGES, {'statusbar': {'slowSource': 'このフォルダーは読み込みが遅いようです（Google ドライブなどのクラウドドライブ？）。サムネイル作成中に次のファイルを先に取り込みます。ドライブのアプリでフォルダーを「オフラインで使用可能」にすると、ずっと速くなります。'}})

_merge(MESSAGES, {'gs': {'group': {'content': '写真に写っているもの'}, 'content': {'analyse': '写っているもので検索', 'analyseSub': 'このコンピューターで写真を1枚ずつバックグラウンドで読み取ります（進行状況は［アルバム］›［提案］に表示）', 'started': '写真を読み取っています。読み取りが済んだ写真から、写っているもので検索できます。', 'unsupported': '写っているものの読み取りにはグラフィックカード（WebGL）が必要ですが、ここでは使えません。'}}, 'content': {'shows': '写っているもの', 'searchTitle': '［写真］で「{name}」を検索'}})

_merge(MESSAGES, {'source': {'local': 'このコンピューターのディスク', 'external': '外付けディスク（USB、メモリーカード）', 'cloud': 'クラウドドライブ', 'cloudNamed': 'クラウド：{service}', 'network': 'ネットワーク上', 'externalShort': '外付け', 'networkShort': 'ネットワーク', 'cloudShort': 'クラウド'}})

_merge(MESSAGES, {'brand': {'pluginNote': '有効なプラグイン「{plugin}」がアプリの名前とロゴを設定しています。ここの欄が空のあいだはそれが使われ、自分で入力すればそちらが優先されます。', 'usePlugin': 'プラグインのものを使う'}, 'plugins': {'givesBrand': '有効なあいだ、アプリの名前を「{name}」にし、ロゴを設定します。', 'givesLogo': '有効なあいだ、アプリのロゴを設定します。'}})

_merge(MESSAGES, {'dupes': {'compare': '並べて比較', 'compareTitle': '残すコピーを左に、別のコピーを右に表示して同じであることを確認します', 'compareExternal': 'コンピューターのアプリでそれぞれ別のウィンドウで開き、並べて比較します', 'open': 'LionPhotos で開く', 'keeping': 'このコピーを残します', 'keepThis': 'このコピーを残す（ほかはごみ箱へ）'}})

_merge(MESSAGES, {'similar': {'titleShown': '表示中の写真から似た写真', 'shownTitle': '表示中の写真（このフォルダー・年・アルバム、フィルター込み）のうち、実質的に同じ写真をまとめ、残すものを選びます', 'fewShown': '似た写真を探すには、写真を2枚以上表示してください。', 'more': {'other': 'さらに表示（残り {count} グループ）'}}})

_merge(MESSAGES, {'similar': {'button': '似た写真', 'more': {'one': 'さらに表示（残り {count} グループ）', 'other': 'さらに表示（残り {count} グループ）'}}})

_merge(MESSAGES, {'sidebar': {'forget': 'この一覧から外す（アルバムや印は残ります）', 'forgotten': '{folder} を以前開いたフォルダーの一覧から外しました。カタログは残っているので、もう一度開けばすべてそのままです。', 'forgetUndone': '{folder} を一覧に戻しました。'}})

_merge(MESSAGES, {'compare': {'onLeft': '左', 'onRight': '右', 'strip': '比較中の写真', 'stripHint': 'クリックすると選択中の側に表示します', 'count': {'one': '{count} 枚', 'other': '{count} 枚のうち 2 枚ずつ表示'}}})

_merge(MESSAGES, {'similar': {'count': {'one': '{count} 枚', 'other': '{count} 枚'}, 'countTitle': 'このグループの写真の枚数', 'notOne': '同じグループではない', 'notOneTitle': 'これらの写真は同じグループではありません（似た構図で別の人が写っている場合など）。今後まとめられません', 'photoMenu': 'この写真のその他の操作', 'setBest': 'ベストに選ぶ', 'keepOnly': {'one': 'これだけ残す：もう 1 枚は保留へ', 'other': 'これだけ残す：ほかの {count} 枚は保留へ'}, 'takeOut': 'グループから外す', 'compareThis': '並べて比較', 'takenOut': '{name} をグループから外しました。今後これらの写真とまとめられません。', 'notOneDone': {'one': 'この写真はグループから外れました。', 'other': 'これら {count} 枚はグループではなくなり、今後まとめられません。'}}})

_merge(MESSAGES, {'similar': {'whoUnknownTitle': 'この写真の人物はまだ調べていません。いま調べています', 'whoUnknown': '人物を検索中…', 'whoNone': '人物なし', 'faceNamed': '{name} — クリックで変更', 'faceName': {'person': 'この人は誰ですか？', 'pet': 'このペットは？'}, 'eyebrowPerson': '人物', 'eyebrowPet': 'ペット', 'faceLabel': '名前', 'faceSave': '保存', 'faceSaved': '{name} を保存しました。この顔は「人物」に表示されます。', 'stack': '似た写真をまとめる', 'stackTitle': '似た写真のグループを 1 枚（ベスト）で表示し、枚数を示します（数字をクリックでグループを開く）', 'stackReading': 'まとめるために写真を読み込み中', 'stackOpen': {'one': '似た写真 {count} 枚のグループ', 'other': '似た写真 {count} 枚のグループ'}, 'stackBadge': {'one': '似た写真 {count} 枚：グループを開く', 'other': '似た写真 {count} 枚：グループを開く'}}, 'compare': {'more': 'この写真のその他の操作', 'keepTitle': '残すか保留へ送るか（スペースキー）', 'stays': '残す', 'goes': '保留へ', 'hintKeep': 'スペース：残す/送る · ← → グループの別の写真 · Tab で左右切替 · ホイールで両方を拡大'}, 'carry': {'labels': 'アルバムと人物', 'mark': 'マーク', 'stays': '残す', 'field': '項目', 'inKept': '残す写真', 'inGoing': '送る写真', 'empty': '空', 'from': '{name} から', 'apply': '引き継いで続ける', 'skip': '引き継がずに続ける', 'title': {'one': '送る写真に、残す写真にない情報が {count} 件あります', 'other': '送る写真に、残す写真にない情報が {count} 件あります'}, 'message': '残す写真に引き継ぐものを選んでください（カタログに保存され、元に戻せます）。より完全なもの・より新しいものに最初からチェックが入っています。'}})

_merge(MESSAGES, {'similar': {'statusReading': 'まとめるために写真を読み込み中：{done} / {total}', 'statusFaces': '顔を検索中：{done} / {total} 枚 — 別の人が写ったグループは分かれます', 'statusPaused': '一時停止中', 'statusDone': '{groups} · {photos} 枚中 {grouped} 枚がグループに入っています（各グループはベストを表示）', 'statusGroups': {'one': '似た写真のグループ {count} 件', 'other': '似た写真のグループ {count} 件'}, 'statusNone': '表示中の {photos} 枚に似た写真はありません'}})

_merge(MESSAGES, {'similar': {'statusFromCatalog': {'one': '{count} 枚の顔はカタログから（解析済み）', 'other': '{count} 枚の顔はカタログから（解析済み）'}}})

_merge(MESSAGES, {'similar': {'only': 'グループのみ', 'onlyTitle': '似た写真のグループだけを表示します（各グループはベストの 1 枚）。単独の写真は表示しません'}})

_merge(MESSAGES, {'photos': {'kind': {'grouped': 'グループの写真'}}})

_merge(MESSAGES, {'viewer': {'stackLabel': {'one': '似た写真 {count} 枚', 'other': '似た写真 {count} 枚'}, 'stackOpen': '残す写真を選ぶ', 'stackOpenTitle': 'グループを開いて、残す写真と保留へ送る写真を選びます'}})

_merge(MESSAGES, {'similar': {'why': {'menu': 'なぜまとめられて（いない）？', 'title': 'これらの写真がまとめられて（いない）理由', 'reading': '写真を読み込み中…', 'picture': '画像', 'unread': '未読み込み（サムネイルなし）', 'alike': '{pct} 似ている（{level} の基準は {need}）', 'time': '時間', 'apart': '{span} の差（最大 {max}）', 'people': '人物', 'others': 'それぞれ別の人が写っています', 'notSeen': 'まだ解析していません', 'same': '同じ人物（または人物なし）', 'decision': 'あなたの判断', 'said': '同じグループではないと指定されています', 'together': '同じグループです。', 'firstPhoto': '互いには十分似ていますが、入るはずのグループはあまり似ていない写真から始まっています（各写真はグループの最初の写真にも似ている必要があります）。', 'wouldAt': '{levels} ならまとめられます。', 'never': 'どの基準でもまとめられません。', 'useLevel': '{level} でまとめる', 'unsay': '同じグループです', 'stillReading': '写真をまだ読み込み中です。グループは変わる可能性があります。', 'lead': '撮影順に隣り合う写真ごとに、現在の基準（{level}）で判断した内容を示します。', 'seconds': '{n} 秒', 'minutes': '{m} 分 {s} 秒', 'hours': '{h} 時間 {m} 分'}}})

_merge(MESSAGES, {'similar': {'why': {'minutesOnly': '{m} 分', 'days': {'one': '{count} 日', 'other': '{count} 日'}}}})

_merge(MESSAGES, {'photos': {'rawsInGroup': {'one': 'このグループの RAW ファイル {count} 個', 'other': 'このグループの RAW ファイル {count} 個'}}})

_merge(MESSAGES, {'similar': {'sens': {'label': 'まとめるために必要な似ている度合い', 'title': '「似ている」側ほど多くの写真がまとまり、「ほぼ同じ」側ほどほぼ同一の写真だけになります', 'value': '{pct}% 類似、最大 {min} 分差', 'same': 'ほぼ同じ', 'alike': '似ている'}, 'why': {'alikeSens': '{pct} 似ている（現在の感度の基準は {need}）', 'wouldFrom': '感度を {v} 以上にするとまとめられます。', 'useSens': '感度 {v} を使う', 'leadSens': '撮影順に隣り合う写真ごとに、現在の感度（100 中 {v}）で判断した内容を示します。'}, 'removeFromGroup': '写真をグループから外す', 'removedFromGroup': '{name} をグループから外しました。今後これらの写真とまとめられません。'}})

_merge(MESSAGES, {'similar': {'makeSingle': '単独にする'}})

_merge(MESSAGES, {'labels': {'type': {'person': {'find': '人物を検索または追加'}, 'pet': {'find': 'ペットを検索または追加'}, 'place': {'find': '場所を検索または追加'}, 'album': {'find': 'アルバムを検索または追加'}}, 'findOrNew': 'Enter：「{name}」を作成', 'findNone': '「{name}」は見つかりません — Enter で作成'}})

_merge(MESSAGES, {'similar': {'why': {'content': '内容', 'contentUnread': '内容モデルでまだ読み込まれていません', 'contentAlike': '写っている内容が {pct} 類似（内容モデル）'}}})

_merge(MESSAGES, {'similar': {'mode': {'label': '似た写真の表示方法', 'all': 'すべて', 'stacks': 'まとめる', 'groups': 'グループのみ', 'allTitle': 'すべての写真を 1 枚ずつ', 'stacksTitle': '似た写真のグループを 1 枚（ベスト）で表示し、スタックと枚数を示します', 'groupsTitle': '似た写真のグループだけ（単独の写真は表示しません）', 'groupsOff': '単独の写真も表示'}}})

_merge(MESSAGES, {'similar': {'pickAll': 'すべて選択', 'pickNoneBtn': '選択を解除', 'pickedOf': '{total} グループ中 {n} グループを選択', 'pickTitle': '選択中：ここでの操作が適用されます', 'inPicked': '選択したグループで：', 'pickNone': 'グループを選択してください'}})

_merge(MESSAGES, {'adjust': {'group': {'curves': 'トーンカーブ'}}, 'curves': {'canvasLabel': 'カーブ：それぞれの明るさがどうなるか', 'channel': 'チャンネル', 'resetChannel': 'このカーブを直線に戻す', 'hint': 'カーブをクリックして点を追加し、ドラッグします。点を外へドラッグするかダブルクリックすると削除します。矢印キーで選んだ点を動かせます。', 'point': '入力 {x} → 出力 {y}', 'mixed': '選択した写真のカーブが異なります。ここでの設定はすべてに適用されます。', 'ch': {'rgb': 'RGB', 'r': '赤', 'g': '緑', 'b': '青', 'rgbTitle': '画像全体（明るさ）', 'rTitle': '画像の赤', 'gTitle': '画像の緑', 'bTitle': '画像の青'}}})

_merge(MESSAGES, {'similar': {'groupSwitch': '写真をまとめる', 'menuTitle': '似ている度合い、グループのみ、似た写真の確認、まとめられて（いない）理由', 'review': '似た写真を確認…', 'sens': {'heading': '感度'}, 'why': {'pick': '2〜12枚の写真を選ぶと、まとめられて（いない）理由が表示されます。'}}})

_merge(MESSAGES, {'similar': {'groupSwitch': '写真をスタック', 'stackTitle': '似た写真のスタックを1枚（ベスト）として、枚数とともに表示します（数字をクリックするとスタックが開きます）', 'menuTitle': '似ている度合い、スタックのみ、似た写真の確認、スタックされて（いない）理由', 'mode': {'groups': 'スタックのみ', 'groupsTitle': '似た写真のスタックのみ（単独の写真は除外）'}, 'statusReading': 'スタックするために写真を読み込み中: {done} / {total}', 'statusFaces': '顔を検索中: {done} / {total} 枚 — 別の人が写るスタックは分かれます', 'statusDone': '{groups} · {photos} 枚中 {grouped} 枚がスタックに入っています（各スタックはベストを表示）', 'statusGroups': {'one': '似た写真のスタック {count} 個', 'other': '似た写真のスタック {count} 個'}, 'stackBadge': {'one': '似た写真 {count} 枚: スタックを開く', 'other': '似た写真 {count} 枚: スタックを開く'}, 'stackOpen': {'one': '似た写真 {count} 枚のスタック', 'other': '似た写真 {count} 枚のスタック'}, 'why': {'menu': 'なぜスタックされて（いない）？', 'title': 'なぜこれらの写真はスタックされて（いない）？', 'pick': '2〜12枚の写真を選ぶと、スタックされて（いない）理由が表示されます。', 'together': '同じスタックにあります。', 'said': '同じスタックではないとあなたが指定しました', 'unsay': '同じスタックです', 'stillReading': '写真をまだ読み込み中です: スタックはまだ変わる可能性があります。'}, 'sens': {'label': 'スタックするのに必要な似ている度合い', 'title': '「似ている」寄りほど多くスタック、「ほぼ同じ」寄りはほぼ同一の写真のみ'}, 'stackSel': '写真をスタック', 'stackSelTitle': '選択した写真を、似ていなくても1つのスタックにまとめます', 'stackFew': 'スタックするには2枚以上の写真を選んでください。', 'unstack': 'スタックを解除', 'unstackTitle': 'これらの写真のスタックを解除し、1枚ずつ表示に戻します', 'stacked': {'one': '{count} 枚をスタックしました。', 'other': '{count} 枚をスタックしました。'}, 'unstacked': {'one': 'スタックを解除しました。', 'other': '{count} 個のスタックを解除しました。'}, 'removeFromStack': 'スタックから写真を外す', 'removedFromStack': '{name} はスタックから外れ、これらの写真とは再びスタックされません。'}, 'viewer': {'stackOpenTitle': 'スタックを開いて、残す写真と Limbo に送る写真を選びます'}, 'photos': {'rawsInGroup': {'one': 'このスタックの RAW ファイル {count} 個', 'other': 'このスタックの RAW ファイル {count} 個'}}, 'keys': {'stack': '選択をスタック · 解除'}})

_merge(MESSAGES, {'similar': {'keepBestTitle': '各グループの提案された写真を残し、ほかの写真をすぐに Limbo へ送ります（通知から元に戻せます）'}})

_merge(MESSAGES, {'photos': {'pairFiles': {'one': '同じ写真のファイル {count} 個（1枚として表示）:', 'other': '同じ写真のファイル {count} 個（1枚として表示）:'}}})

_merge(MESSAGES, {'similar': {'pairBadge': {'one': '同じ写真のファイル {count} 個（RAW+JPG）: 並べて表示', 'other': '同じ写真のファイル {count} 個（RAW+JPG）: 並べて表示'}}})

_merge(MESSAGES, {'similar': {'setCover': 'カバーにする', 'setCoverTitle': 'このファイルを「写真」に表示する写真にします（RAW + JPEG のカバー）', 'coverTitle': 'カバー: 「写真」に表示されるファイル', 'pairBadge': {'one': '同じ写真のファイル {count} 個（RAW+JPG）: 開く', 'other': '同じ写真のファイル {count} 個（RAW+JPG）: 開く'}}, 'viewer': {'pairLabel': {'one': '同じ写真のファイル {count} 個', 'other': '同じ写真のファイル {count} 個'}}})

_merge(MESSAGES, {'similar': {'setBest': 'ベストに設定', 'setCover': 'ベストに設定', 'setCoverTitle': 'このファイルを「写真」に表示する写真にします（RAW + JPEG のベスト）', 'coverTitle': 'ベスト: 「写真」に表示されるファイル'}})

_merge(MESSAGES, {'photos': {'stacksCount': {'one': 'スタック {count} 個', 'other': 'スタック {count} 個'}, 'singlesCount': {'one': '単独の写真 {count} 枚', 'other': '単独の写真 {count} 枚'}}})

_merge(MESSAGES, {'photos': {'uniqueTotal': 'ユニークな写真の推定合計: {count}', 'uniqueTotalTitle': '似た写真のスタックはそれぞれ1枚、単独の写真も1枚として数えます（RAW + JPEG は1枚）'}})

_merge(MESSAGES, {'photos': {'uniqueCount': {'one': 'ユニークな写真 {count} 枚（推定合計）', 'other': 'ユニークな写真 {count} 枚（推定合計）'}}})
