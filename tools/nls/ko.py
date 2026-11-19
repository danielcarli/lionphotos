# 한국어. Build with: python3 tools/nls/build.py  (no plural forms: one string each)
MESSAGES = {
 'app': {'name': 'LionPhotos', 'tagline': '사진 및 동영상 컬렉션'},
 'workbench': {'preloadMissing': '보안 브리지(preload)를 불러오지 못했습니다. LionPhotos를 다시 시작하세요.'},
 'boot': {'starting': '시작하는 중…', 'reading': '{folder} 여는 중…'},
 'views': {'trash': '휴지통 기록', 'tools': '도구', 'photos': '사진', 'limbo': '보류함', 'overview': '개요', 'duplicates': '중복 파일', 'organize': '정리', 'backup': '백업',
   'project': '프로젝트', 'person': '인물', 'pet': '반려동물', 'place': '장소', 'album': '앨범'},
 'labels': {'editTitle': '이름과 설명 편집', 'descriptionPlaceholder': '무엇에 관한 것인지, 누구를 위한 것인지, 언제인지… (선택)', 'removeFrom': '“{name}”에서 빼기', 'removeFromTitle': '선택한 항목과 “{name}”의 연결을 해제합니다. 인식된 얼굴도 더 이상 연결되지 않습니다(파일은 바뀌지 않음)', 
   'eyebrow': '태그', 'button': '태그…', 'forFolder': '이 폴더의 분류, 프로젝트, 인물, 반려동물, 장소, 앨범',
   'forFiles': '항목 {count}개의 태그',
   'folderHint': '이 폴더 안의 모든 항목(하위 폴더 포함)에 적용됩니다. LionPhotos 카탈로그만 바뀌고 파일은 변경되지 않습니다.',
   'filesHint': '선택한 파일에 적용됩니다. 파일 자체의 분류와 프로젝트가 폴더의 것보다 우선하며, 인물·반려동물·장소는 더해집니다.',
   'back': '{view}(으)로 돌아가기', 'backTitle': '{view}(으)로 돌아가기({key})',
   'none': '(없음)', 'save': '저장', 'edit': '편집', 'add': '추가', 'open': '사진에서 보기', 'rename': '이름 바꾸기', 'delete': '삭제',
   'inherited': '폴더에서: {names}', 'fromFolder': '폴더에서 옴', 'noneYet': '아직 프로젝트, 인물, 반려동물, 장소가 없습니다.',
   'noPhotosGroup': '아직 사진 없음',
   'noItems': '이 컬렉션에 항목이 없습니다', 'howTo': '위에서 하나 만든 다음, 사이드바의 폴더나 선택한 사진에서 "태그…"를 사용하세요.',
   'deleteTitle': '"{name}"을(를) 삭제할까요?', 'deleteMessage': '항목 {count}개에서 제거됩니다. 파일은 변경되지 않습니다.',
   'deleteMessageEmpty': '사용하는 항목이 없습니다. 파일은 변경되지 않습니다.', 'deleteNote': 'LionPhotos 카탈로그에서 태그만 사라지며, 사진과 동영상은 그대로입니다.',
   'type': {
     'project': {'one': '프로젝트', 'plural': '프로젝트', 'new': '새 프로젝트', 'name': '프로젝트 이름', 'add': '+ 프로젝트', 'empty': '아직 프로젝트가 없습니다',
                 'lead': '작업, 연구 또는 의뢰.'},
     'person': {'one': '인물', 'plural': '인물', 'new': '새 인물', 'name': '인물 이름', 'add': '+ 인물', 'empty': '아직 인물이 없습니다',
                'lead': '사진에 나오는 사람. 사진 한 장에 여러 인물을 둘 수 있습니다.'},
     'pet': {'one': '반려동물', 'plural': '반려동물', 'new': '새 반려동물', 'name': '반려동물 이름', 'add': '+ 반려동물', 'empty': '아직 반려동물이 없습니다',
             'lead': '사진에 나오는 동물.'},
     'place': {'one': '장소', 'plural': '장소', 'new': '새 장소', 'name': '장소 이름', 'add': '+ 장소', 'empty': '아직 장소가 없습니다',
               'lead': '사진을 찍은 곳: 도시, 건물, 현장 방문.'},
     'sphere': {'one': '분류', 'plural': '개인 또는 업무', 'new': '', 'name': '', 'add': '', 'empty': '', 'lead': ''},
     'album': {'one': '앨범', 'plural': '앨범', 'new': '새 앨범', 'name': '앨범 이름', 'add': '+ 앨범', 'empty': '아직 앨범이 없습니다',
               'lead': '직접 꾸린 사진 앨범.'}}},
 'albums': {'removeMany': '앨범에서 {count}개 빼기', 'otherSphere': '앨범과 다른 카테고리: {category}', 'showWhich': '표시할 앨범', 'showAll': '전체', 'showPersonal': '개인', 'showProfessional': '업무', 'noPersonal': '개인 사진이 있는 앨범이 아직 없습니다.', 'noProfessional': '업무 사진이 있는 앨범이 아직 없습니다.', 
   'newEllipsis': '새 앨범…', 'moreAlbums': '모든 앨범({count})…',
   'eyebrow': '사진 앨범', 'one': '앨범', 'lead': '여행, 파티, 작업의 가장 좋은 사진을 골라 표지와 설명과 함께 모아 두면 슬라이드 쇼로 바로 보여 줄 수 있습니다. 사진 한 장을 여러 앨범에 넣을 수 있고, 파일은 제자리에 있으며 아무것도 복사되지 않습니다.',
   'new': '새 앨범', 'create': '앨범 만들기', 'name': '이름', 'namePlaceholder': '앨범 이름', 'nameMissing': '새 앨범의 이름을 입력하세요.',
   'description': '설명', 'descriptionPlaceholder': '이 사진들에 대한 설명(선택)',
   'empty': '아직 앨범이 없습니다', 'howTo': '위에서 하나 만들거나, 사진에서 사진을 선택하고 "앨범에 추가…"를 사용하세요.', 'noPhotos': '아직 사진이 없습니다',
   'open': '앨범 열기', 'edit': '앨범 편집', 'delete': '앨범 삭제', 'openAlbum': '앨범 열기',
   'add': '앨범에 추가…', 'addTitleHint': '선택한 사진을 앨범(새 앨범 또는 기존 앨범)에 넣습니다. 파일은 복사되지 않습니다.', 'addKey': '앨범에 추가({key})',
   'addTitle': '항목 {count}개를 앨범에 추가', 'addConfirm': '추가',
   'addNote': 'LionPhotos 카탈로그만 바뀝니다. 사진은 원래 폴더에 있고, 같은 사진을 여러 앨범에 넣을 수 있습니다.',
   'added': '항목 {count}개를 "{name}"에 추가했습니다.',
   'remove': '앨범에서 빼기', 'removeTitle': '선택한 항목을 "{name}"에서 뺍니다(파일은 변경되지 않음)',
   'removed': '항목 {count}개를 "{name}"에서 뺐습니다.',
   'viaFolder': '항목 {count}개는 폴더 전체가 "{name}"에 있어서 들어 있습니다. 사이드바의 해당 폴더에서 "태그…"로 폴더를 빼세요.',
   'setCover': '표지로 사용', 'isCover': '앨범 표지', 'coverTitle': '이 사진을 앨범 표지에 표시합니다',
   'deleteMessage': '항목 {count}개가 든 앨범이 삭제됩니다. 사진은 변경되지 않습니다.',
   'deleteMessageEmpty': '앨범에 사진이 없습니다. 다른 것은 바뀌지 않습니다.', 'deleteNote': 'LionPhotos 카탈로그에서 앨범만 사라지며, 사진과 동영상은 그대로입니다.'},
 'slideshow': {'button': '슬라이드 쇼', 'start': '슬라이드 쇼 시작({key})', 'startTitle': '사진을 한 장씩 전체 화면으로 보여 줍니다(뷰어에서 P)',
   'pause': '일시 정지({key})', 'space': 'Space', 'interval': '사진당 시간', 'seconds': '{n}초', 'fullscreen': '전체 화면({key})'},
 'settings': {'title': '설정', 'tileDetails': '미리 보기에 형식과 분류 표시', 'tileDetailsHint': '끄면 사진에 RAW와 동영상 길이만 표시됩니다.', 'focus': '집중 모드', 'focusHint': '사진만 표시: 사이드바, 정보 패널, 머리글을 숨깁니다. 같은 키나 Esc로 되돌립니다.'},
 'units': {'B': 'B', 'KB': 'KB', 'MB': 'MB', 'GB': 'GB', 'TB': 'TB', 'PB': 'PB', 'bytes': '바이트'},
 'nls': {'auto': '자동', 'language': '언어', 'changeHint': '새 언어로 창을 다시 불러옵니다'},
 'common': {
   'cancel': '취소', 'close': '닫기', 'confirm': '확인', 'explorer': '파일 탐색기', 'fileManager': '파일 관리자',
   'showIn': '{explorer}에서 보기', 'rootFolder': '(컬렉션 폴더)', 'pathCopied': '경로를 복사했습니다.', 'video': '동영상',
   'items': '항목 {count}개', 'files': '파일 {count}개',
   'photos': '사진 {count}장', 'videos': '동영상 {count}개',
   'photosLabel': '사진', 'videosLabel': '동영상'},
 'marks': {
   'label': '평가', 'great': '아주 좋음', 'ok': '괜찮음', 'reject': '보류함으로 보내기', 'none': '평가 없음', 'all': '모든 평가',
   'greatTitle': '아주 좋음: 별 하나({key})', 'okTitle': '괜찮음({key})', 'rejectTitle': '보류함으로 보내기({key})', 'clearTitle': '평가 지우기({key})',
   'rejectBadge': '보류', 'option': '{name}({count})',
   'trashRejects': '보류함의 파일 {count}개 삭제',
   'trashRejectsTitle': '이 폴더의 삭제 후보({size})를 모두 휴지통으로 옮깁니다. 확인 코드가 필요합니다',
   'hint': '1 · 2 · 3 키로 선택 항목을 평가하고 0으로 지웁니다. LionPhotos 카탈로그만 바뀝니다.'},
 'titlebar': {'openFolder': '사진 폴더 열기({key})', 'placeholder': '사진과 동영상 폴더를 여세요'},
 'activitybar': {'ariaLabel': '보기', 'toggleSidebar': '사이드바 표시/숨기기({key})'},
 'editor': {'breadcrumbsLabel': '폴더'},
 'selection': {'period': '기간', 'formats': '형식', 'folders': '폴더', 'noMarks': '없음', 'add': '추가…',
   'some': '{n}/{total}', 'allTitle': '선택한 모든 항목', 'remove': '빼기',
   'removeTitle': '선택한 항목 {n}개에서 "{name}"을(를) 뺍니다(파일은 변경되지 않음)',
   'fromFolder': '폴더에서 온 것입니다. 폴더의 "태그…"에서 바꾸세요',
   'noAlbums': '아직 어떤 앨범에도 없습니다.', 'noPeople': '아직 표시된 사람이 없습니다.',
   'noLabels': '프로젝트가 없습니다.', 'noPets': '아직 반려동물이 없습니다.',
   'noPlaces': '아직 장소가 없습니다.'},
 'sphere': {'scope': {'all': '모든 사진에서', 'personal': '개인 사진에서', 'professional': '업무 사진에서', 'none': '미분류 사진에서'}, 'scopeTitle': '이 페이지의 기준이 되는 사진: 제목 표시줄에서 선택', 'personal': '개인', 'professional': '업무', 'none': '미분류',
   'pickTitle': '개인, 업무, 아직 분류되지 않은 사진 또는 모든 사진 보기',
   'option': {'all': '모든 사진', 'personal': '개인 사진', 'professional': '업무 사진', 'none': '미분류'},
   'optionCount': '{name}({count})', 'label': '분류', 'set': '{name}(으)로 표시', 'clear': '"{name}" 빼기',
   'summary': '개인 {personal} · 업무 {professional} · 미분류 {none}',
   'clearAll': '분류를 뺍니다(파일 자체의 것. 폴더의 것은 남습니다)', 'fromFolder': '{count}개는 폴더에서 분류를 받습니다'},
 'faces': {
   'auto': '얼굴 자동으로 찾기', 'autoOn': '켜짐: 새로 고칠 때마다 새 사진을 분석합니다.', 'autoOff': '꺼짐: "지금 색인"을 누를 때만 얼굴을 찾습니다.',
   'autoHint': '켜짐: LionPhotos가 새로 고칠 때마다 새 사진과 바뀐 사진에서 백그라운드로 얼굴을 찾습니다.',
   'indexNow': '지금 색인', 'indexNowCount': '지금 색인(새 사진 {count}장)', 'indexNowTitle': '이 컬렉션에서 아직 분석하지 않은 사진에서 얼굴을 찾습니다',
   'stopRun': '중지', 'last': '마지막 색인: {when}', 'never': '색인한 적 없음', 'lastTitle': '이 컬렉션의 사진을 마지막으로 분석한 시각',
   'unsupported': '이 컴퓨터는 얼굴 인식을 지원하지 않습니다.',
   'unsupportedGpu': '그래픽 가속(WebGL을 지원하는 그래픽 카드)이 필요합니다. 프로세서만으로는 사진 한 장에 몇 초가 걸립니다.',
   'unsupportedMemory': '메모리가 4GB 이상 필요합니다(이 컴퓨터: {detail}).',
   'gpuBoost': '전용 그래픽 카드 사용', 'gpuBoostTitle': '고성능 그래픽 카드를 요청하고 Chromium 차단 목록을 무시한 채 LionPhotos를 다시 시작합니다. 되돌릴 수 있습니다.', 'gpuBoostOff': '기본 그래픽으로 돌아가기', 'gpuBoostOffTitle': '전용 그래픽 카드를 요청하지 않고 LionPhotos를 다시 시작합니다',
   'tryAnyway': '그래도 시도', 'tryAnywayTitle': '실제로 인식을 시작합니다. 그래픽 카드를 쓸 수 있으면 켜진 상태로 유지됩니다', 'technical': '기술 세부 정보: {detail}',
   'eyebrow': '얼굴 인식',
   'offTitle': '이 컬렉션의 얼굴 인식',
   'offLead': 'LionPhotos가 사진에서 얼굴을 찾아 비슷한 얼굴끼리 묶습니다. 한 번 이름을 붙이면 다른 사진에도 그 사람이 제안으로 표시되고, 확인하거나 고칠 수 있습니다.',
   'private': '모든 작업은 이 컴퓨터에서 이루어지며 사진이나 얼굴은 어디로도 보내지지 않습니다. LionPhotos 카탈로그만 바뀌고 파일은 그대로입니다.',
   'start': '사진 {count}장에서 얼굴 찾기',
   'working': '얼굴을 찾는 중…', 'paused': '얼굴 인식 일시 정지됨', 'ready': '얼굴 인식 켜짐',
   'progress': '사진 {done}/{total}장 · 얼굴 {faces}개 찾음', 'summary': '사진 {photos}장 분석 · 얼굴 {faces}개. 새 사진은 새로 고칠 때마다 분석됩니다.',
   'error': '인식이 멈췄습니다: {error}', 'pause': '일시 정지', 'resume': '계속', 'stop': '끄기',
   'stopTitle': '이 컬렉션의 얼굴 인식을 끕니다(찾은 얼굴과 인물은 남습니다)',
   'stopConfirm': '얼굴 인식을 끌까요?', 'stopMessage': '새 사진은 더 이상 분석하지 않습니다. 이미 찾은 얼굴, 이름, 각 사진의 인물은 남습니다.',
   'peopleLead': '사진에 나오는 사람. 사진 한 장에 여러 인물을 둘 수 있습니다. 얼굴 인식을 켜면 LionPhotos가 얼굴로 표시합니다.',
   'toCheck': 'LionPhotos가 제안한 얼굴 {count}개가 확인을 기다립니다. 각 인물을 여세요.',
   'howToNamed': '아래 얼굴 그룹에 이름을 붙이거나 위에서 인물을 만드세요.',
   'review': '이 사람의 얼굴 확인', 'reviewBar': '얼굴 확인', 'reviewShort': '얼굴', 'pendingTitle': '확인할 제안 {count}개',
   'whoTitle': '누구인가요?', 'groupsCount': '그룹 {count}개',
   'whoLead': '아직 이름이 없는 비슷한 얼굴입니다. 이름(새 인물 또는 기존 인물)을 입력하고 Enter를 누르면 그룹의 모든 얼굴에 이름이 붙고, LionPhotos가 다른 사진에서도 그 사람을 제안합니다. ×는 얼굴을 그룹에서 뺍니다.',
   'groupsWaiting': '사진을 분석하면서 그룹이 여기에 나타납니다.', 'groupsNone': '찾은 얼굴에 모두 이름이 있거나 무시되었습니다.',
   'moreGroups': '그룹 {count}개 더 보기',
   'namePlaceholder': '누구인가요?', 'save': '저장', 'named': '얼굴 {count}개에 "{name}" 이름을 붙였습니다.',
   'notInGroup': '이 사람이 아님: 그룹에서 빼기(무시)', 'groupMeta': '얼굴 {count}개 · 사진 {photos}장',
   'ignoreGroup': '무시', 'ignoreGroupTitle': '모르는 사람, 배경의 얼굴: 그룹에서 빠지고 제안되지 않습니다',
   'ignoredLink': '무시한 얼굴 {count}개', 'ignoredTitle': '무시한 얼굴',
   'ignoredLead': '표시되거나 제안되지 않는 얼굴입니다. 필요하면 그룹으로 돌려놓으세요.', 'ignoredNone': '무시한 얼굴이 없습니다.', 'unignore': '그룹으로 돌려놓기',
   'facesCount': '얼굴 {count}개',
   'suggestedTitle': '확인할 제안 {count}개',
   'suggestedLead': 'LionPhotos가 {name}과(와) 닮았다고 본 얼굴입니다. 사진에는 이미 {name}이(가) 있습니다. ✓는 확인, ×는 아님(다시 제안되지 않음).',
   'confirmAll': '모두 확인({count})', 'confirmedTitle': '확인된 얼굴 {count}개',
   'noConfirmed': '아직 확인된 얼굴이 없습니다.', 'confirm': '확인: 이 사람입니다', 'notThem': '{name} 아님', 'someoneElse': '다른 사람입니다…',
   'deleteNote': 'LionPhotos 카탈로그에서 인물만 사라지고, 그 얼굴은 다시 미확인이 됩니다. 사진은 그대로입니다.'},
 'pets': {
   'eyebrow': '반려동물 인식', 'auto': '반려동물 자동으로 찾기', 'autoOn': '켜짐: 새로 고칠 때마다 새 사진을 분석합니다.', 'autoOff': '꺼짐: "지금 색인"을 누를 때만 반려동물을 찾습니다.',
   'autoHint': '켜짐: LionPhotos가 새로 고칠 때마다 새 사진과 바뀐 사진에서 백그라운드로 반려동물을 찾습니다.',
   'indexNow': '지금 색인', 'indexNowCount': '지금 색인(새 사진 {count}장)', 'indexNowTitle': '이 컬렉션에서 아직 분석하지 않은 사진에서 반려동물을 찾습니다',
   'stopRun': '중지', 'last': '마지막 색인: {when}', 'never': '색인한 적 없음', 'lastTitle': '이 컬렉션의 사진에서 반려동물을 마지막으로 찾은 시각',
   'unsupported': '이 컴퓨터는 반려동물 인식을 지원하지 않습니다.',
   'private': '모든 작업은 이 컴퓨터에서 이루어지며 사진은 어디로도 보내지지 않습니다. LionPhotos 카탈로그만 바뀌고 파일은 그대로입니다.',
   'working': '반려동물을 찾는 중…', 'paused': '반려동물 인식 일시 정지됨',
   'progress': '사진 {done}/{total}장 · 동물 {faces}마리 찾음', 'summary': '사진 {photos}장 분석 · 동물 {faces}마리. 개, 고양이, 새, 말, 양, 소를 찾습니다.',
   'error': '인식이 멈췄습니다: {error}', 'pause': '일시 정지', 'resume': '계속',
   'peopleLead': '사진에 나오는 동물. LionPhotos가 개, 고양이, 새, 말, 양, 소를 찾아 비슷한 것끼리 묶습니다. 같은 품종의 두 마리는 닮을 수 있으니 제안을 확인하세요.',
   'toCheck': 'LionPhotos가 제안한 동물 {count}마리가 확인을 기다립니다. 각 반려동물을 여세요.',
   'howToNamed': '아래 동물 그룹에 이름을 붙이거나 위에서 반려동물을 만드세요.',
   'review': '이 반려동물의 사진 확인', 'reviewBar': '인식 결과 확인', 'reviewShort': '사진', 'pendingTitle': '확인할 제안 {count}개',
   'whoTitle': '어느 반려동물인가요?', 'groupsCount': '그룹 {count}개',
   'whoLead': '아직 이름이 없는 비슷한 동물입니다. 이름(새 반려동물 또는 기존 반려동물)을 입력하고 Enter를 누르면 그룹의 모든 동물에 이름이 붙고, LionPhotos가 다른 사진에서도 그 반려동물을 제안합니다. ×는 그룹에서 뺍니다.',
   'groupsWaiting': '사진을 분석하면서 그룹이 여기에 나타납니다.', 'groupsNone': '찾은 동물에 모두 이름이 있거나 무시되었습니다.',
   'moreGroups': '그룹 {count}개 더 보기',
   'namePlaceholder': '어느 반려동물?', 'save': '저장', 'named': '동물 {count}마리에 "{name}" 이름을 붙였습니다.',
   'notInGroup': '이 반려동물이 아님: 그룹에서 빼기(무시)', 'groupMeta': '이미지 {count}개 · 사진 {photos}장',
   'ignoreGroup': '무시', 'ignoreGroupTitle': '내 반려동물이 아닌 동물: 그룹에서 빠지고 제안되지 않습니다',
   'ignoredLink': '무시한 동물 {count}마리', 'ignoredTitle': '무시한 동물',
   'ignoredLead': '표시되거나 제안되지 않는 동물입니다. 필요하면 그룹으로 돌려놓으세요.', 'ignoredNone': '무시한 동물이 없습니다.', 'unignore': '그룹으로 돌려놓기',
   'facesCount': '이미지 {count}개',
   'suggestedTitle': '확인할 제안 {count}개',
   'suggestedLead': 'LionPhotos가 {name}과(와) 닮았다고 본 동물입니다. 사진에는 이미 {name}이(가) 있습니다. ✓는 확인, ×는 아님(다시 제안되지 않음).',
   'confirmAll': '모두 확인({count})', 'confirmedTitle': '확인된 이미지 {count}개',
   'noConfirmed': '아직 확인된 이미지가 없습니다.', 'confirm': '확인: 이 반려동물입니다', 'notThem': '{name} 아님', 'someoneElse': '다른 반려동물입니다…',
   'deleteNote': 'LionPhotos 카탈로그에서 반려동물만 사라지고, 그 이미지는 다시 미확인이 됩니다. 사진은 그대로입니다.'},
 'species': {'dog': '개', 'cat': '고양이', 'bird': '새', 'horse': '말', 'sheep': '양', 'cow': '소'},
 'home': {'button': '처음', 'title': '처음: 컬렉션의 모든 사진과 동영상, 필터 없음({key})',
   'allYears': '모든 연도 보기', 'allYearsTitle': '모든 연도의 사진을 다시 보여 줍니다', 'year': '연도'},
 'panels': {'folders': '폴더', 'albums': '앨범', 'labels': '태그', 'dates': '날짜', 'title': '사이드바의 {name}(다시 클릭하면 숨김)',
   'allAlbums': '모든 앨범', 'manage': '{name} 관리', 'allDates': '모든 날짜', 'datesHint': '연도를 고르면 사진에 그 해의 사진만 표시됩니다(촬영 날짜 또는 파일 날짜 기준).'},
 'sidebar': {
   'title': '라이브러리', 'folder': '컬렉션', 'folders': '폴더', 'resize': '끌어서 크기 조정',
   'depthLabel': '하위 폴더 단계', 'depthDecrease': '단계 줄이기', 'depthIncrease': '단계 늘리기', 'unlimited': '모든 단계',
   'hint': {'unlimited': '모든 하위 폴더를 읽습니다.', 'none': '하위 폴더 없이 폴더 자체만.', 'depth': '하위 폴더를 {count}단계까지 읽습니다.'},
   'refresh': '새로 고침', 'refreshFolder': '이 폴더 새로 고침',
   'refreshTitle': '"{folder}"와 그 하위 폴더에서 새 파일과 바뀐 파일을 찾습니다({key}). 바뀌지 않은 파일은 미리 보기를 유지합니다.',
   'scope': '"{folder}"와 그 하위 폴더만 읽으며, 디스크의 다른 곳은 읽지 않습니다.',
   'changeFolder': '바꾸기…', 'changeFolderTitle': '다른 폴더 열기({key})', 'openFolder': '폴더 열기…', 'stop': '중지({key})',
   'scanCount': '파일 {count}개 찾음 · 새 파일 또는 바뀐 파일 {changed}개',
   'emptyTree': '폴더를 열면 여기에 하위 폴더가 표시됩니다.', 'moreFolders': '… 폴더 {count}개 더'},
 'statusbar': {
   'ready': '준비', 'scanning': '폴더 읽는 중: 파일 {count}개',
   'thumbs': '미리 보기 {done} / {total}', 'thumbsTitle': '백그라운드에서 미리 보기를 만드는 중. 화면에 보이는 것부터',
   'previews': '동영상 미리 보기 {done} / {total}', 'stopPreviews': '중지',
   'selected': '{count}개 선택 · {size}',
   'revealTitle': '선택한 항목 보기(클릭할 때마다 다음 항목)',
   'theme': '테마', 'themeAuto': '자동', 'themeLight': '밝게', 'themeDark': '어둡게', 'themeTeal': '파랑',
   'themeAutoTitle': '시스템 테마 따르기', 'themeLightTitle': '밝은 테마', 'themeDarkTitle': '어두운 테마', 'themeTealTitle': '파란 테마: 로고의 파랑'},
 'welcome': {
   'logoAlt': '{app} 로고', 'lead': '폴더를 열면 사진과 동영상을 미리 보기로 보고, 이름·카메라·작성자·코덱으로 검색하고, 폴더로 정리할 수 있습니다.',
   'openFolder': '폴더 열기', 'collections': '전에 연 컬렉션',
   'shortcuts': {'openFolder': '폴더 열기', 'refresh': '새 파일과 바뀐 파일 찾기', 'search': '검색'},
   'note': '미리 보기는 한 번만 만들어 작은 로컬 캐시에 보관하며, 파일이 바뀔 때만 다시 만듭니다. 아무것도 컴퓨터 밖으로 나가지 않습니다.'},
 'broad': {'eyebrow': '아주 큰 폴더', 'diskTitle': '디스크 전체를 읽을까요?', 'homeTitle': '사용자 폴더 전체를 읽을까요?',
   'message': 'LionPhotos는 고른 폴더와 그 하위 폴더만 읽습니다. "{folder}"에는 그 안의 모든 것이 들어 있으므로 모든 폴더를 읽게 됩니다.',
   'note': '보통은 사진이 있는 폴더(예: 사진 폴더나 프로젝트 폴더)를 고르는 편이 좋습니다.',
   'confirm': '그래도 읽기'},
 'photos': {'noAlbum': '앨범에 없는 사진만', 'noAlbumTitle': '아직 어느 앨범에도 없는 사진과 동영상만 표시합니다', 'noAlbumClear': '앨범에 있는 사진도 표시', 
   'modeLabel': '보기 방식', 'modeGrid': '격자', 'modeList': '목록',
   'gridLabel': '사진과 동영상', 'search': '검색', 'searchPlaceholder': '이름, 폴더, 카메라, 작성자, 코덱 검색…',
   'kind': {'all': '전체', 'images': '사진', 'videos': '동영상'}, 'year': '연도', 'allYears': '모든 연도',
   'sort': {'': '정렬', 'newest': '최신순', 'oldest': '오래된 순', 'name': '이름', 'size': '큰 순'},
   'filters': '필터', 'filtersTitle': '종류, 연도, 평가, 하위 폴더', 'more': '더 보기', 'moreTitle': '선택 항목에 대한 더 많은 작업: 열기, 이름 바꾸기, 이동, 정리, 휴지통…', 'thisFolderOnly': '이 폴더만',
   'subfolders': '하위 폴더', 'subfoldersHint': '선택한 폴더의 하위 폴더 항목도 표시',
   'zoom': '미리 보기 크기', 'toggleInfo': '정보 패널({key})', 'selectGroup': '모두 선택', 'select': '선택',
   'selected': '{count}개 선택', 'open': '열기', 'moveTo': '폴더로 이동…', 'organize': '날짜별 정리',
   'trash': '휴지통으로 이동', 'clearSelection': '선택 해제', 'clearFilters': '필터 지우기',
   'empty': {'title': '여기에는 사진이나 동영상이 없습니다', 'hint': '이 폴더에는 사진이나 동영상이 없습니다. 트리에서 다른 폴더를 고르거나 "하위 폴더"를 켜세요.',
             'scanning': '폴더 읽는 중…', 'filtered': '필터와 일치하는 항목이 없습니다', 'filteredHint': '다른 단어, 연도, 종류로 시도해 보세요.'}},
 'list': {'name': '이름', 'folder': '폴더', 'type': '종류', 'dimensions': '해상도', 'size': '크기', 'date': '날짜', 'details': '카메라 · 작성자 · 코덱'},
 'category': {'original': '원본', 'edited': '편집본', 'raw': 'RAW', 'video': '동영상', 'graphic': '기타 이미지',
   'hint': {'original': '편집하지 않은 카메라 사진(JPEG, HEIC, TIFF)', 'edited': '편집한 사본: 이름에 -Edit, -2… 가 있거나 Lightroom, Photoshop 등으로 저장한 것',
            'raw': '카메라 RAW 파일(CR2, NEF, ARW, DNG…)', 'video': '동영상', 'graphic': 'PNG, GIF, WebP 등 이미지: 스크린샷, 스캔, 일러스트'}},
 'info': {'organize': '정리', 'addTo': '추가', 'notOrganized': '아직 앨범, 인물, 장소, 프로젝트에 없습니다', 'selectionFiles': '파일', 'folders': '폴더 {count}개', 'next': '다음 사진', 'nextTitle': '패널은 그대로 두고 다음 사진으로(Alt+↓, Alt+↑는 이전)', 'inThis': '포함 항목', 'details': '세부 정보', 'fileDetails': '파일 및 카메라',
   'empty': '사진이나 동영상을 선택하면 세부 정보가 표시됩니다.', 'selection': '선택', 'reveal': '보기', 'openDefault': '기본 앱으로 열기', 'copyPath': '경로 복사',
   'file': '파일', 'format': '형식', 'size': '크기', 'taken': '촬영 날짜', 'modified': '수정한 날짜', 'folder': '폴더',
   'image': '이미지', 'dimensions': '해상도', 'encoding': '인코딩', 'compression': {'baseline': 'JPEG 기준선', 'progressive': 'JPEG 프로그레시브'},
   'orientation': '방향', 'orientationRotated': '카메라가 회전함',
   'video': '동영상', 'container': '컨테이너', 'videoCodec': '동영상 코덱', 'resolution': '해상도', 'fps': '초당 프레임', 'duration': '길이',
   'bitrate': '비트레이트', 'audioCodec': '오디오', 'noAudio': '오디오 없음', 'rotation': '회전', 'mono': '모노', 'stereo': '스테레오',
   'camera': '카메라', 'device': '기기', 'lens': '렌즈', 'exposure': '노출', 'aperture': '조리개', 'iso': 'ISO', 'focal': '초점 거리',
   'flash': '플래시', 'flashOn': '발광', 'flashOff': '발광 안 함', 'location': '위치(GPS)',
   'authorship': '작성자 정보', 'author': '작성자', 'copyright': '저작권', 'title': '제목', 'description': '설명', 'software': '소프트웨어',
   'integrity': '내용'},
 'viewer': {'opening': '실제 크기로 여는 중…', 'edit': '편집', 'editTitle': '편집 패널 표시 또는 접기: 분류, 앨범, 보정, 설명, 작가와 장소(I)', 'outOfFilter': '이 사진은 이제 “{category}”에 있습니다. 뷰어가 열려 있는 동안은 여기 남아 있고, 닫은 뒤에는 제목 표시줄의 분류 필터 “{category}”에서 찾을 수 있습니다.', 'zoomLevel': '확대/축소', 'zoomIn': '확대(+)', 'zoomOut': '축소(−)', 'zoomToggle': '화면에 맞춤 ↔ 실제 크기(Z) · 휠로 포인터 위치를 확대, 끌어서 이동', 'label': '뷰어', 'previous': '이전(←)', 'next': '다음(→)', 'zoom': '실제 크기',
   'imageUnsupported': '{format} 파일은 여기서 원래 크기로 표시할 수 없습니다. 이것은 미리 보기입니다.',
   'videoUnsupported': '이 동영상({format})은 여기서 재생할 수 없습니다.',
   'rawFull': '카메라 JPEG 원래 크기 · {size}', 'rawPreview': '카메라 JPEG · {size}(이 파일에 저장된 가장 큰 것)',
   'rawNoteTitle': '모든 RAW 파일에는 카메라가 자체 설정으로 만든 JPEG가 들어 있습니다. 이것이 그 이미지이며, 사진을 현상하기 전에 Lightroom과 시스템 뷰어가 보여 주는 것과 같습니다.'},
 'previews': {
   'generate': '미리 보기 만들기', 'one': '이 동영상의 5초 미리 보기 만들기', 'folderTitle': '이 폴더 동영상의 5초 미리 보기 만들기',
   'eyebrow': '동영상 미리 보기', 'nothingToDo': '이 동영상들에는 이미 미리 보기가 있습니다.',
   'scope': {'one': '이 동영상', 'folder': '이 폴더의 동영상', 'all': '색인된 모든 동영상', 'selected': '선택한 동영상 {count}개'},
   'confirm': {'title': '동영상 {count}개의 미리 보기를 만들까요?',
     'message': '{scope}에 대해 처음 5초를 미리 보기 크기의 짧은 클립으로 만듭니다. 마우스를 동영상 위에 올리면 재생됩니다.',
     'videos': '동영상', 'time': '예상 시간', 'about': '약 {time}',
     'note': '처리 시간이 필요합니다. 백그라운드에서 한 번에 하나씩, 미리 보기 다음에 진행되므로 LionPhotos를 계속 쓸 수 있고 상태 표시줄에서 멈출 수 있습니다.',
     'start': '백그라운드에서 만들기'},
   'started': '동영상 {count}개를 미리 보기 대기열에 추가했습니다.'},
 'overview': {
   'eyebrow': '컬렉션', 'title': '개요', 'collection': '사진과 동영상', 'itemsUnit': '항목',
   'size': '크기', 'period': '기간', 'previews': '동영상 미리 보기',
   'kinds': '종류별 파일', 'kindsHint': '꽃잎이 클수록 파일이 많습니다. 클릭하면 볼 수 있습니다.', 'total': '합계',
   'legend': {'kind': '종류', 'files': '파일', 'size': '크기'},
   'previewsHint': '색인된 모든 동영상의 5초 미리 보기를 백그라운드에서 만듭니다.', 'noVideos': '이 컬렉션에는 동영상이 없습니다.',
   'byYear': '연도별', 'byYearHint': '연도를 클릭해 보기', 'formats': '형식', 'cameras': '카메라와 휴대폰', 'camerasHint': '파일 메타데이터 기준',
   'codecs': '동영상 코덱', 'authors': '작성자', 'noMeta': '미리 보기를 만들면서 표시됩니다.',
   'cache': '미리 보기 캐시', 'cacheHint': '한 번만 만들고, 파일이 바뀔 때만 다시 만듭니다',
   'cacheThumbs': '미리 보기', 'cachePreviews': '동영상 미리 보기', 'cacheAverage': '평균 미리 보기', 'cacheFile': '캐시 파일', 'clearCache': '캐시 지우기…'},
 'dupes': {
   'eyebrow': '같은 내용(SHA-256)', 'title': '중복 파일',
   'lead': '이름이 아니라 내용으로 똑같은 사본을 찾습니다. 먼저 크기, 그다음 각 파일의 앞부분과 끝부분을 비교하고, 필요할 때만 파일 전체를 읽습니다. 남길 사본을 고르면 나머지는 휴지통으로 갑니다.',
   'find': '중복 파일 찾기', 'again': '다시 찾기', 'starting': '시작하는 중…',
   'stage': {'partial': '앞부분과 끝부분 비교 중 · {done} / {total}', 'full': '같은 내용 확인 중 · {pct}%'},
   'wasted': '남는 사본이 차지하는 공간', 'notRun': '아직 확인하지 않음', 'groups': '똑같은 파일 그룹 {count}개',
   'none': '중복 파일이 없습니다', 'noneHint': '이 컬렉션의 사진과 동영상은 모두 하나뿐입니다.',
   'copies': '사본 {count}개', 'each': '각각', 'keep': '남기기', 'toTrash': '휴지통',
   'trashCopies': '사본 {count}개를 휴지통으로 이동',
   'trashAll': '남는 사본 {count}개를 휴지통으로 이동…',
   'more': '더 보기({count}개 남음)'},
 'organize': {'theme': '주제', 'themePlaceholder': '예: 졸업식', 'split': 'Raw/와 Img/로 나누기', 'splitHint': '각 폴더에서 카메라 RAW 파일(과 .xmp)은 Raw/로, JPG, PNG, HEIC… 는 Img/로 갑니다. 동영상은 폴더에 남습니다.', 'byAlbum': '앨범별 폴더', 'byAlbumHint': '각 앨범을 “연도/연도-월-일-앨범”으로 옮깁니다. 날짜는 첫 사진 기준입니다. 두 앨범에 있는 사진은 먼저 시작하는 앨범으로 갑니다. 각 앨범은 새 폴더로 사진을 유지합니다.', 'noAlbums': '사진이 있는 앨범이 아직 없습니다.', 'runAlbums': '앨범 {count}개 정리({photos})', 'photos': '사진 {count}장', 
   'eyebrow': '정리', 'title': '컬렉션 정리', 'lead': '모든 변경은 먼저 계획을 보여 주고 입력할 코드를 요구합니다. 변경은 아래에서 실행 취소할 수 있습니다.',
   'byDate': '날짜별 폴더', 'byDateHint': '촬영 날짜(EXIF)를 쓰고, 없으면 파일 날짜를 씁니다.',
   'pattern': {'yearSlashMonth': '2024 / 2024-07', 'yearMonth': '2024-07', 'year': '2024', 'yearSlashDay': '2024 / 2024-07-14', 'dayTheme': '2024-07-14-주제'},
   'scope': {'selected': '선택한 항목 {count}개', 'view': '사진에 표시된 항목 {count}개'},
   'run': '항목 {count}개 정리…', 'moreFolders': '… 폴더 {count}개 더',
   'moveTitle': '폴더로 이동', 'moveLead': '고른 폴더로 항목을 옮기고 종류별 하위 폴더로 나눕니다. 같은 사진의 파일(RAW, Lightroom 부속 파일, 편집본과 원본 JPEG)은 함께 옮겨집니다.',
   'moveRun': '폴더로 이동…', 'history': '최근 작업', 'noHistory': '아직 작업이 없습니다.', 'undone': '실행 취소됨',
   'trashNote': '휴지통에서 복원'},
 'move': {
   'eyebrow': '폴더로 이동', 'title': '항목 {count}개 이동', 'destination': '대상',
   'newFolder': '이 컬렉션의 새 폴더', 'newFolderDefault': '선택 {date}', 'otherFolder': '다른 폴더', 'choose': '선택…', 'noneChosen': '선택한 폴더 없음',
   'split': '종류별 하위 폴더로 나누기',
   'sub': {'raw': 'RAW', 'original': 'JPG', 'edited': '편집본', 'video': '동영상'},
   'subLabel': {'raw': 'RAW 파일', 'original': '원본 사진', 'edited': '편집한 사진', 'video': '동영상'},
   'subHint': {'raw': 'CR2, NEF, ARW, DNG… 및 .xmp', 'original': '편집하지 않은 카메라 JPEG', 'edited': '-Edit, -2, Lightroom, Photoshop…', 'video': 'MP4, MOV…'},
   'related': '관련 파일도 함께 옮기기', 'relatedHint': '같은 폴더에 있는 같은 사진의 파일: RAW, Lightroom의 .xmp, 이름이 같은 편집본과 원본 JPEG.',
   'continue': '계속…'},
 'backup': {
   'eyebrow': '폴더별 백업', 'title': '백업',
   'lead': '아무 디스크에서나 마스터 폴더와 백업 폴더를 고르세요. 이름과 위치에 관계없이 하위 폴더까지 내용으로 비교하여, 양쪽에 다 있는 것, 백업에 없는 것, 백업에만 있는 것을 보여 줍니다.',
   'master': '마스터 폴더', 'backup': '백업 폴더', 'noFolder': '폴더 없음', 'pickHint': '폴더를 고르세요…',
   'choose': '선택…', 'change': '바꾸기…', 'useCollection': '열린 컬렉션 사용', 'swap': '마스터와 백업 바꾸기',
   'exact': '모든 파일의 내용 확인(느림)',
   'exactHint': '끄면 양쪽에서 하위 폴더, 이름, 크기, 날짜가 같은 파일은 읽지 않고 같다고 봅니다. 켜면 가능한 모든 쌍을 바이트 단위로 비교합니다(SHA-256).',
   'compare': '비교', 'compareAgain': '다시 비교',
   'safe': '비교는 읽기만 합니다. 복사는 확인 코드가 필요하고, 파일을 덮어쓰지 않으며, 각 사본을 원본과 대조합니다.',
   'stage': {'scan': '폴더 목록 작성 중… 파일 {count}개', 'quick': '크기가 같은 파일 비교 중… {done}/{total}', 'full': '확인을 위해 파일 전체 읽는 중… {size}의 {pct}%'},
   'tab': {'onlyMaster': '마스터에만', 'both': '양쪽 모두', 'onlyBackup': '백업에만'},
   'tabHint': {'onlyMaster': '아직 백업에 없습니다. 복사해서 백업을 완성하세요.', 'both': '같은 사진이 양쪽의 같은 하위 폴더 또는 다른 곳에 있습니다.', 'onlyBackup': '백업에는 있지만 마스터에는 없음: 마스터에서 지웠거나 원래 없던 것.'},
   'sub': {'missingInBackup': '백업에 없음', 'allBackedUp': '모두 백업됨', 'both': '같은 위치 {same} · 다른 위치 {elsewhere}', 'missingInMaster': '마스터에 없음', 'nothingExtra': '추가 항목 없음'},
   'empty': {'onlyMaster': '마스터의 사진이 모두 백업에 있습니다.', 'both': '양쪽에 다 있는 사진이 없습니다.', 'onlyBackup': '백업에는 마스터에 없는 것이 없습니다.'},
   'samePlace': '같은 위치', 'inBackupAt': '백업의 {path}', 'copies': '사본 {count}개', 'rootFolder': '(주 폴더)',
   'layout': '사본 배치', 'layoutMirror': '같은 하위 폴더', 'layoutDate': '날짜별 폴더(YYYY/YYYY-MM)',
   'copyToBackup': '파일 {count}개를 백업으로 복사…',
   'copyToMaster': '파일 {count}개를 마스터로 복사…',
   'copyStarted': '파일 {count}개({size})를 백그라운드에서 복사하는 중…',
   'copying': '복사 중 {done}/{total}…', 'copied': '파일 {count}개를 복사하고 대조했습니다({size}).',
   'more': '{count}개 더 보기'},
 'renameFile': {'eyebrow': '파일', 'title': '"{name}" 이름 바꾸기', 'label': '새 이름(확장자는 유지)', 'button': '이름 바꾸기…'},
 'contextMenu': {'addToAlbum': '앨범에 추가', 'rename': '이름 바꾸기…', 'renameOne': '이름 바꾸기는 한 번에 파일 하나만 됩니다', 'category': '분류', 'sendLimbo': '보류함으로 보내기', 'restore': '사진으로 돌려놓기', 'selected': '항목 {count}개 선택'},
 'projects': {'ofAlbum': '프로젝트', 'noProject': '프로젝트 없음', 'open': '프로젝트 열기', 'status': '상태', 'client': '의뢰처', 'clientPlaceholder': '기관, 고객 또는 수업', 'place': '장소', 'noPlace': '장소 없음', 'due': '마감일', 'team': '팀', 'removeFromTeam': '{name}을(를) 팀에서 빼기', 'addToTeam': '사람 추가…', 'noPeople': '인물에 아직 아무도 없습니다.', 'albumsCount': '앨범 {count}개', 'checkBackup': '백업 확인', 'newAlbum': '프로젝트에 새 앨범', 'addAlbum': '앨범 가져오기…', 'albumsTitle': '프로젝트 앨범 {count}개', 'panel': '프로젝트 패널', 'all': '전체', 'noneInStatus': '이 상태의 프로젝트가 없습니다.', 'st': {'active': '진행 중', 'selecting': '선별 중', 'delivered': '전달 완료', 'archived': '보관됨'}, 'stat': {'photos': '사진과 동영상', 'sorted': '분류됨', 'unsorted': '표시 없음 {count}장', 'noMark': '표시 없음', 'toDelete': '삭제 예정', 'edited': '편집된 RAW', 'editedHint': '옆에 편집본이 있는 것', 'chosen': '선택됨', 'chosenHint': '{albums}의 사진 {count}장', 'alt': '화면 해설 있음', 'altMissing': '앨범 사진 중 아직 없는 것 {count}장', 'backup': '백업'}},
 'plugins': {'view': {'exportChosen': '선택한 {count}개 내보내기…', 'selectAll': '모두 선택', 'clear': '선택 해제', 'pickHint': '내보낼 앨범과 프로젝트를 클릭하거나, 내보내기를 열고 거기서 고르세요.', 'manage': '플러그인 관리', 'version': '버전 {version}', 'empty': '아직 사진이 있는 앨범이나 프로젝트가 없습니다', 'emptyHint': '이 플러그인이 내보내는 것: {types}. 하나 만들고 사진을 넣으세요.', 'tabTitle': '플러그인 페이지: 앨범과 프로젝트 내보내기'}, 'eyebrow': '플러그인', 'title': '플러그인', 'hint': '앨범과 프로젝트를 페이지(HTML, CSS, JavaScript)로 내보내는 패키지입니다. LionPhotos 안에서는 코드를 실행하지 않습니다.', 'install': '플러그인 설치…', 'installed': '플러그인 “{name}” {version}을(를) 설치했습니다.', 'installFailed': '설치할 수 없습니다: {error}', 'removed': '플러그인을 제거했습니다(휴지통에 있습니다).', 'remove': '제거', 'enable': '켜기', 'disable': '끄기', 'none': '설치된 내보내기 플러그인이 없습니다', 'noneHint': '.lionplugin 패키지를 설치하면 앨범과 프로젝트를 페이지로 내보낼 수 있습니다.', 'noneInstalled': '설치된 플러그인이 없습니다.', 'export': {'zip': '모든 내용을 담은 .zip도 만들기', 'zipHint': '페이지와 사진을 담은 파일 하나를 폴더 옆에 만듭니다(보내기·첨부용).', 'zipDone': '모든 내용의 사본이 “{zip}”에 있습니다.', 'zipSkipped': '.zip을 만들지 않았습니다(4GB 초과). 폴더에 모두 있습니다.', 'showZip': '.zip 보기', 'button': '내보내기…', 'buttonTitle': '플러그인으로 페이지 내보내기', 'title': '플러그인으로 내보내기', 'which': '플러그인', 'what': '내보낼 항목', 'size': '사진 크기', 'sizePx': '최대 {n} px', 'sizeFull': '원래 크기', 'originals': '원본 파일 포함', 'next': '폴더를 고르고 내보내기…', 'note': '페이지와 사진 사본이 담긴 새 폴더를 만듭니다. 원래 사진은 바뀌지 않습니다.', 'count': '{collections}의 사진 {count}장', 'collections': '앨범 또는 프로젝트 {count}개', 'empty': '내보낼 것이 없습니다: 선택한 앨범과 프로젝트에 사진이 없습니다.', 'running': '내보내는 중…', 'progress': '사진 {count}장 중 {done}장', 'done': '사진 {count}장을 “{folder}”(으)로 내보냈습니다.', 'someFailed': '{count}장은 변환하지 못했습니다.', 'failed': '내보내기에 실패했습니다: {error}', 'canceled': '내보내기를 취소했습니다.', 'openPage': '페이지 열기', 'showFolder': '폴더에서 보기'}},
 'crop': {'title': '자르기 및 수평 맞추기', 'open': '자르기 및 수평 맞추기…', 'canvasLabel': '자르기 틀이 있는 사진: 안쪽을 끌어 이동하고, 모서리와 변을 끌어 크기를 바꿉니다', 'levelHint': '지평선(또는 곧아야 하는 것)을 따라 선을 그으세요', 'ratio': {'free': '자유', 'original': '원본'}, 'social': {'igPortrait': 'Instagram 세로', 'igGrid': 'Instagram 그리드', 'igSquare': 'Instagram 정사각형', 'story': '스토리, 릴스, TikTok', 'youtube': 'YouTube 및 화면', 'link': '링크(Facebook, LinkedIn)', 'pinterest': 'Pinterest', 'xHeader': 'X 헤더', 'linkedinCover': 'LinkedIn 커버'}, 'swapTitle': '세로 ↔ 가로 (X)', 'swap': '비율 돌리기', 'keepRatio': '비율 유지', 'shape': '비율', 'socialTitle': '소셜 네트워크', 'rotateTitle': '회전', 'rotateLeft': '왼쪽 90°', 'rotateRight': '오른쪽 90°', 'rotateLeftTitle': '시계 반대 방향으로 90° 회전', 'rotateRightTitle': '시계 방향으로 90° 회전', 'straighten': '수평 맞추기', 'level': '지평선에 맞추기', 'levelNote': '슬라이더를 끌거나 “맞추기”를 눌러 지평선 위에 선을 그으세요. 슬라이더를 두 번 클릭하면 0°로 돌아갑니다.', 'reset': '초기화', 'apply': '적용', 'result': '결과: {size} px · {ratio}', 'preparing': '사진을 준비하는 중…', 'cannot': '이 사진을 자르기용으로 열 수 없습니다.', 'cropped': '잘림', 'turned': '{deg}° 회전', 'straightened': '{deg}° 수평 맞춤', 'remove': '자르기 취소', 'removeTitle': '회전이나 수평 맞추기 없이 사진 전체로 돌아갑니다'},
 'trashlog': {'eyebrow': '정리', 'title': '휴지통 기록', 'lead': 'LionPhotos가 시스템 휴지통으로 보낸 파일과 림보가 확보한 공간입니다. 휴지통을 비우면 디스크 공간이 돌아옵니다.', 'loading': '기록을 읽는 중…', 'emptyTitle': '아직 휴지통으로 보낸 파일이 없습니다', 'emptyLead': '림보의 사진이나 중복 사본을 삭제하면 확보된 공간과 함께 여기에 표시됩니다.', 'files': '파일 {count}개', 'freedByLimbo': '림보로 확보한 공간', 'freedHint': '삭제 표시 후 휴지통으로 보낸 사진', 'thisMonth': '이번 달 림보', 'fromDuplicates': '중복 파일', 'allSent': '휴지통으로 보낸 전체', 'unknownSize': '{count}개는 크기 기록 없음(이전 버전)', 'byMonth': '림보로 확보한 공간(월별)', 'byMonthHint': '삭제가 있었던 최근 12개월', 'noLimbo': '아직 림보에서 휴지통으로 간 파일이 없습니다.', 'listTitle': '휴지통으로 보낸 파일', 'listCount': '파일 {count}개 · {size}', 'search': '이름이나 폴더로 검색', 'nothingFound': '이 필터에 맞는 파일이 없습니다.', 'showMore': '더 보기({count}개 남음)', 'copy': '목록 복사', 'copyTitle': '목록(날짜, 파일, 폴더, 바이트, 출처)을 복사해 스프레드시트에 붙여 넣습니다', 'copied': '{count}행을 복사했습니다.', 'copyFailed': '목록을 복사할 수 없습니다.', 'col': {'when': '시각', 'file': '파일', 'folder': '폴더', 'size': '크기', 'bytes': '바이트', 'from': '출처'}, 'from': {'all': '전체', 'limbo': '림보', 'duplicates': '중복', 'other': '선택', 'unknown': '—'}},
 'adjust': {'highlights': '밝은 영역', 'whites': '흰색 계열', 'blacks': '검정 계열', 'temperature': '색온도', 'tint': '색조', 'vibrance': '활기', 'bw': '흑백', 'bwRed': '빨강', 'bwGreen': '초록', 'bwBlue': '파랑', 'sharpness': '선명도', 'texture': '텍스처', 'clarity': '부분 대비', 'vignette': '비네팅', 'groupChanged': '이 그룹에 조정이 있습니다', 'eyedropper': '스포이트', 'eyedropperTitle': '화이트 밸런스: 회색이나 흰색이어야 하는 지점을 클릭하세요', 'eyedropperHint': '사진에서 회색이나 흰색이어야 하는 지점을 클릭하세요(Esc로 취소).', 'auto': '자동', 'autoTitle': '사진 자체로 노출, 흰색, 검정, 대비, 활기를 계산합니다', 'presets': '사전 설정', 'presetsTitle': '이름을 붙여 저장한 조정으로, 다른 사진에 적용할 수 있습니다', 'presetSave': '이 사진의 조정 저장…', 'presetSaveTitle': '새 사전 설정', 'presetName': '이름', 'presetSaveConfirm': '저장', 'presetSaved': '사전 설정 “{name}”을(를) 저장했습니다.', 'presetDelete': '사전 설정 삭제', 'bwTitle': '사진을 흑백으로 바꿉니다. 아래 슬라이더로 각 색을 밝게 또는 어둡게 합니다', 'detailNoGpu': 'GPU를 시작하는 중 오류가 발생하여 선명도, 텍스처, 부분 대비를 켤 수 없습니다.', 'compare': '전후 비교', 'compareTitle': '전후 비교: 선을 끌어 비교하세요', 'before': '전', 'after': '후', 'group': {'light': '빛', 'color': '색', 'detail': '디테일', 'effects': '효과'}, 'applying': '보정을 적용하는 중…', 'title': '보정', 'exposure': '노출', 'contrast': '대비', 'shadows': '그림자', 'saturation': '채도', 'resetOne': '두 번 클릭: 0으로', 'reset': '초기화', 'none': '보정 없음', 'edited': '편집됨', 'someAdjusted': '{total}장 중 {count}장 보정됨', 'allSelected': '슬라이더를 움직이면 선택한 사진 {count}장 모두에 그 값이 적용됩니다.', 'copy': '보정 복사', 'copied': '보정을 복사했습니다. 다른 사진에 붙여 넣으세요.', 'paste': '보정 붙여넣기', 'pasteMany': '{count}장에 붙여넣기', 'pasteTitle': '복사한 보정을 선택한 사진 {count}장에 적용', 'save': '편집 사본 저장…({count})', 'saveTitle': '원본 옆에 메타데이터를 담은 새 JPEG를 만듭니다. 원본은 바뀌지 않습니다', 'rendering': '편집한 사진을 만드는 중…', 'renderingN': '{total}장 중 {done}장 만드는 중…', 'cannotSave': '이 사진들은 여기서 원래 크기로 만들 수 없습니다(JPEG, PNG, WebP… 및 카메라 JPEG가 있는 RAW만).', 'viewerNote': 'LionPhotos에서 보정됨 · \\를 누르고 있으면 원본'},
 'describe': {'writeNothing': '아직 LionPhotos에서 입력한 내용이 없어 파일에 기록할 것이 없습니다(보이는 내용은 파일 자체의 정보입니다).', 'mixedShort': '값이 서로 다름 — 입력한 내용이 모두에 적용됩니다', 'fromFileBadge': '파일에서', 'fromFileTitle': '사진 자체 메타데이터의 내용입니다. 바꾸면 직접 쓴 값이 됩니다', 'pendingTitle': 'LionPhotos에 입력했지만 아직 파일에 기록되지 않음', 'pending': '아직 파일에 기록되지 않은 항목 {count}개', 'mixedPick': '값을 보고 모두에 적용할 값 고르기', 'different': '{count}가지', 'emptyValue': '(비어 있음)', 'noneYet': '아직 설명 없음', 'inSome': '{value}({total}장 중 {n}장)', 'noAlt': '화면 해설 없음', 'missingOf': '{total}장 중 {count}장 화면 해설 없음', 'noAuthorPlace': '아직 작가와 장소 없음', 'keywordsAdd': '추가…', 'keywordRemove': '“{word}” 빼기', 'moreFields': '추가 항목: 직함, 지침', 'lessFields': '항목 줄이기', 'undoWhat': '실행 취소: {what}({count}장)', 'undoTitle': '마지막 변경 실행 취소(Ctrl+Z)', 'redo': '다시 실행', 'redoTitle': '다시 실행(Ctrl+Shift+Z)', 'undone': '실행 취소됨(사진 {count}장): {what}.', 'redone': '다시 실행됨(사진 {count}장): {what}.', 'changedMany': '사진 {count}장 변경됨: {what}.', 'nothingToUndo': '실행 취소할 내용이 없습니다.', 'nothingToRedo': '다시 실행할 내용이 없습니다.', 'headline': '헤드라인', 'headlineHint': '사진에 대한 한 줄 설명(장소와 날짜 제외)', 'authorTitle': '직함', 'authorTitleHint': '사진기자, 인턴…', 'placeTitle': '촬영자와 장소', 'sublocation': '장소(세부 위치)', 'sublocationHint': '예: 컨벤션 센터, 본 캠퍼스', 'city': '도시', 'state': '주/도', 'country': '국가', 'keywords': '키워드', 'keywordsHint': '쉼표로 구분', 'instructions': '지시 사항', 'instructionsHint': '엠바고, 사용 제한…', 'fromFile': '사진 메타데이터: {value}', 'allSelected': '여기에 쓴 내용은 선택한 사진 {count}장 모두에 적용됩니다.', 'write': '파일 {count}개에 기록…', 'writeHint': '이 메타데이터를 파일에 기록해 다른 프로그램에서도 보이게 합니다: JPEG는 파일 안에, 다른 형식은 옆의 .xmp 파일에', 'author': '촬영자', 'authorHint': '사진을 찍은 사람 — 내보낸 페이지의 크레디트', 'authorFromCamera': '사진 메타데이터: {name}', 'title': '설명', 'caption': '사진 설명', 'captionHint': '사진에 담긴 내용(캡션)', 'alt': '화면 해설', 'altHint': '이미지를 볼 수 없는 사람을 위해 설명하세요 — 화면 낭독기가 읽는 텍스트입니다', 'mixed': '텍스트가 서로 다릅니다 — 여기에 쓴 내용이 모두에 적용됩니다', 'inFile': '파일에 있는 설명: “{text}”', 'useFile': '사용', 'missing': '화면 해설이 없는 항목 {count}개', 'missingShort': '화면 해설 없음 {count}개'},
 'folderAlbums': {'button': '폴더에서…', 'buttonTitle': '컬렉션의 폴더로 앨범 만들기', 'fromFolder': '이 폴더로 앨범 만들기', 'title': '폴더로 앨범 만들기', 'lead': '선택한 폴더마다 폴더 이름으로 앨범을 하나씩 만듭니다.', 'leadFolder': '“{folder}” 안에서 선택한 폴더마다 앨범을 만듭니다.', 'modeLabel': '어떤 폴더', 'mode': {'top': '첫 번째 단계', 'leaf': '사진이 들어 있는 폴더', 'none': '직접 선택'}, 'modeHint': {'top': '바로 아래의 각 폴더가 하위 폴더와 함께 앨범이 됩니다.', 'leaf': '사진을 직접 담고 있는 각 폴더가 앨범이 됩니다.', 'none': '선택 없음: 아래에서 폴더를 선택하세요.'}, 'withParent': '위 폴더 이름 포함(“이탈리아 · 로마”)', 'listLabel': '폴더', 'already': '이미 앨범임', 'nameTaken': '같은 이름의 앨범이 있음', 'create': '앨범 {count}개 만들기', 'createNone': '폴더를 선택하세요', 'photos': '사진 {count}장', 'note': '각 앨범은 폴더 전체와 연결됩니다. 나중에 폴더에 넣은 사진도 앨범에 들어갑니다. LionPhotos 카탈로그만 바뀌며 파일을 옮기거나 복사하지 않습니다.', 'done': '폴더로 앨범 {count}개를 만들었습니다.', 'show': '앨범 보기'},
 'openWith': {'title': '연결 프로그램', 'open': '열기', 'searching': '프로그램을 찾는 중…', 'none': '사진이나 동영상 프로그램을 찾지 못했습니다', 'default': '기본 프로그램', 'system': '다른 앱 선택…', 'other': '다른 프로그램…', 'manyTitle': '{app}에서 파일 {count}개를 열까요?', 'manyMessage': '파일마다 프로그램에서 열리므로 사진이 많으면 시간이 걸릴 수 있습니다.', 'failed': '{app}에서 열 수 없습니다: {error}'},
 'renameFolder': {'eyebrow': '폴더', 'button': '폴더 이름 바꾸기(F2)', 'title': '"{name}" 이름 바꾸기', 'label': '새 이름', 'next': '계속'},
 'limbo': {'title': '보류함', 'lead': '삭제 후보로 표시한 사진과 동영상은 사진 밖 여기에서 결정을 기다립니다: 삭제(확인 코드를 입력해 휴지통으로)하거나 돌려놓으세요.',
   'items': '보류함의 파일 {count}개', 'restoreAll': '모두 사진으로 돌려놓기', 'restoreTitle': '보류함에서 꺼내 사진으로',
   'send': '보류함으로 보내기', 'sendTitle': '선택한 사진은 사진에서 빠져, 삭제하거나 돌려놓을 때까지 보류함에서 기다립니다',
   'restoreSelected': '사진으로 돌려놓기',
   'confirmOne': '파일 "{name}"을(를) 보류함으로 보낼까요?', 'confirmMany': '선택한 파일 {count}개를 보류함으로 보낼까요?',
   'confirmMessage': '사진에서 빠져, 삭제(휴지통)하거나 돌려놓을 때까지 보류함에서 기다립니다. 파일 자체에는 아무 일도 없습니다.',
   'empty': '보류함이 비어 있습니다', 'emptyHint': '사진을 삭제 후보로 표시하면(미리 보기의 휴지통 또는 3 키) 여기에서 기다립니다.'},
 'convert': {
   'eyebrow': 'HEIC 사진', 'button': 'JPG/PNG로…', 'buttonTitle': '선택한 HEIC 사진의 JPG 또는 PNG 사본 만들기',
   'title': 'HEIC 사진 {count}장 변환',
   'message': '각 사진 옆에 원래 해상도의 새 파일을 씁니다. 원본 HEIC는 그대로입니다.',
   'jpg': 'JPG: 호환성 최고', 'jpgDetail': '어디서나 열립니다(Windows, 웹사이트, 인쇄소, 오래된 프로그램). 품질 95%: 눈에 보이는 손실 없음.',
   'png': 'PNG: 무손실', 'pngDetail': '모든 픽셀이 디코딩한 그대로. 파일이 몇 배 커집니다.',
   'note': '촬영 날짜, 카메라, 렌즈, 위치(EXIF)와 색 프로필을 그대로 옮기므로 색이 바뀌지 않습니다.',
   'next': '계속'},
 'ops': {'edit': {'saved': '편집 사본 {count}개를 저장했습니다.', 'undone': '편집 사본 {count}개를 휴지통으로 옮겼습니다.'}, 'writeMeta': {'undone': '파일 {count}개가 기록 전 상태로 돌아갔습니다.', 'done': '파일 {count}개에 메타데이터를 기록했습니다.', 'inside': '{count}개는 이미지 안(JPEG).', 'sidecars': '{count}개는 옆의 .xmp 파일.'}, 'renameFile': {'done': '파일 이름을 "{name}"(으)로 바꿨습니다.'}, 'renameFolder': {'done': '폴더 이름을 "{name}"(으)로 바꿨습니다.'},
   'convert': {'started': '사진 {count}장을 백그라운드에서 {format}(으)로 변환하는 중…',
   'done': '사진 {count}장을 {format}(으)로 변환했습니다.'},
   'trash': {'done': '파일 {count}개를 휴지통으로 옮겼습니다({size}).'},
   'organize': {'done': '항목 {count}개를 정리했습니다.'},
   'move': {'done': '파일 {count}개를 옮겼습니다.'},
   'undo': {'': '실행 취소', 'done': '파일 {count}개를 복원했습니다.'},
   'failed': '{count}개는 바꿀 수 없었습니다.',
   'clearCache': {'done': '캐시를 지웠습니다. 미리 보기를 다시 만드는 중입니다.'}},
 'confirm': {
   'bytes': {'trash': {'title': '이 파일 {count}개가 차지하는 공간', 'hint': '휴지통을 비우면 디스크에서 확보됩니다.'},
             'backupCopy': {'title': '복사할 파일 {count}개', 'hint': '대상의 여유 공간을 확인했습니다.'}},
   'eyebrow': '확인', 'codeLabel': '확인하려면 아래 코드를 입력하세요(붙여넣기 불가):', 'inputLabel': '코드 {code} 입력',
   'pasteDisabled': '코드를 직접 입력하세요. 붙여넣기는 꺼져 있습니다.', 'running': '작업 중…', 'failed': '작업을 완료할 수 없습니다.',
   'more': '… {count}개 더', 'skipped': '항목 {count}개를 건너뛰었습니다(이미 제자리에 있거나 없음).'},
 'about': {'title': 'LionPhotos 정보', 'version': '버전 {version}', 'createdBy': '만들고 구상한 사람: {author}',
   'team': '© {year} LionPhotos Team', 'license': 'MIT 라이선스의 오픈 소스. "있는 그대로" 제공되며 어떠한 보증도 없습니다.',
   'privacy': '인터넷 없이 작동: 계정도 원격 측정도 없습니다. 미리 보기와 메타데이터는 로컬 파일에 저장됩니다.',
   'fonts': '글꼴: Plus Jakarta Sans 및 JetBrains Mono(SIL Open Font License).'},
 'main': {'edit': {'suffix': '-편집', 'title': '편집 사본 {count}개 저장', 'message': '각 원본 옆에 보정, 원본의 메타데이터, LionPhotos에서 입력한 내용을 담은 새 JPEG를 만듭니다.', 'confirm': '사본 저장', 'note': '원본은 바뀌지 않습니다.', 'skipped': '사진 {count}장은 여기서 만들 수 없어 제외합니다.', 'nothing': '저장할 것이 없습니다.', 'summary': '편집 사본 {count}개 저장', 'undoTitle': '편집 사본 {count}개를 휴지통으로 옮길까요?', 'undoMessage': '만든 사본은 휴지통으로 가고, 원본은 그대로입니다.', 'toBin': '휴지통으로', 'undoNothing': '사본이 바뀌었거나 없어져서 실행 취소할 것이 없습니다.'}, 'meta': {'undo': {'title': '파일 {count}개에 대한 기록 실행 취소', 'message': '파일이 메타데이터를 기록하기 전과 똑같은 상태로 돌아갑니다. LionPhotos에서 입력한 내용은 카탈로그에 남습니다.', 'inside': '이전 버전(바이트 단위로 동일)', 'sidecarMade': '기록할 때 만든 파일: 휴지통으로', 'sidecarBack': '이전 텍스트로 돌아감', 'note': '현재 버전은 휴지통으로 이동합니다.', 'changed': '파일 {count}개는 기록 후 변경되어 그대로 둡니다.', 'nothing': '파일이 기록 후 변경되었거나 없어져서 실행 취소할 내용이 없습니다.'}, 'write': {'title': '파일 {count}개에 메타데이터 기록', 'message': 'LionPhotos에서 쓴 내용(촬영자, 캡션, 음성 해설, 장소, 키워드…)을 파일에 기록해 다른 프로그램에서도 볼 수 있게 합니다.', 'inside': '이미지 안', 'sidecar': '옆의 {name}', 'confirm': '메타데이터 기록', 'noteInside': 'JPEG: 메타데이터는 파일 안에 기록되며, 이미지 자체는 바뀌지 않고 이전 버전은 휴지통으로 갑니다.', 'noteSidecar': '다른 형식: 원본은 건드리지 않고, 데이터는 옆의 .xmp 파일에 기록됩니다.', 'skipped': '사진 {count}장은 LionPhotos에서 쓴 메타데이터가 없어 그대로 둡니다.', 'nothing': '이 사진들에는 LionPhotos에서 쓴 메타데이터가 없습니다.', 'tooLarge': '메타데이터가 너무 커서 JPEG에 넣을 수 없습니다.', 'summary': '파일 {count}개에 메타데이터 기록'}}, 
   'common': {'rootFolder': '(컬렉션 폴더)'},
   'labels': {'errors': {'noName': '이름을 입력하세요.'}},
   'dialog': {'pickFolder': {'title': '사진과 동영상 폴더 열기'}},
   'plugins': {'pickTitle': '플러그인 선택(.lionplugin)', 'fileType': 'LionPhotos 플러그인', 'destTitle': '내보내기 폴더를 만들 위치', 'errors': {'notZip': '올바른 패키지가 아닙니다.', 'tooBig': '패키지가 너무 큽니다.', 'tooManyFiles': '패키지에 파일이 너무 많습니다.', 'encrypted': '패키지가 암호로 보호되어 있습니다.', 'compression': '지원하지 않는 압축 방식입니다.', 'badPath': '패키지 안의 잘못된 경로: {detail}', 'unexpectedFile': '패키지 안의 허용되지 않는 파일: {detail}', 'fileType': '허용되지 않는 파일 형식: {detail}', 'manifest': 'plugin.json이 불완전하거나 잘못되었습니다({detail}).', 'noManifest': '패키지에 plugin.json이 없습니다.', 'noEntry': '패키지에 {detail} 페이지가 없습니다.'}, 'install': {'title': '플러그인 “{name}” {version} 설치', 'message': '만든 사람: {author}. 페이지 틀과 이미지를 담고 있으며, LionPhotos 안에서는 아무것도 실행되지 않습니다.', 'replaces': '버전 {version}을(를) 대체하며, 이전 버전은 휴지통으로 갑니다.', 'confirm': '설치', 'note': '믿을 수 있는 사람의 플러그인만 설치하세요: 내보낸 페이지는 여는 사람의 브라우저에서 플러그인의 JavaScript를 실행합니다.'}, 'remove': {'title': '플러그인 “{name}” 제거', 'message': '플러그인 폴더는 휴지통으로 갑니다. 이미 내보낸 페이지는 그대로 남습니다.', 'confirm': '제거'}, 'export': {'noteZip': '옆에 모든 내용을 담은 .zip이 만들어집니다.', 'title': '“{name}”(으)로 사진 {count}장 내보내기', 'message': '{folder}에 새 폴더를 만듭니다.', 'photos': '사진 {count}장', 'confirm': '내보내기', 'note': '사진의 축소 사본을 만듭니다. 원본은 바뀌지 않습니다.', 'noteOriginals': '원본 파일도 복사합니다. 원본은 바뀌지 않습니다.', 'nothing': '내보낼 것이 없습니다.', 'busy': '이미 내보내기가 진행 중입니다.', 'summary': '사진 {count}장을 {folder}(으)로 내보내기'}},
   'openWith': {'title': '열 프로그램 선택', 'programs': '프로그램'},
   'library': {'errors': {'noFolder': '먼저 폴더를 여세요.', 'notFolder': '폴더를 찾을 수 없습니다: {folder}'}},
   'backup': {'errors': {'noFolder': '있는 폴더를 고르세요.', 'same': '마스터와 백업이 같은 폴더입니다.',
     'nested': '한 폴더가 다른 폴더 안에 있습니다. 서로 다른 두 폴더를 고르세요.', 'expired': '비교 결과가 오래되었습니다. 다시 비교하세요.',
     'nothing': '복사할 것이 없습니다. 이미 모두 있습니다.', 'noSpace': '여유 공간이 부족합니다: {need} 필요, {free} 남음.'}},
   'ops': {
     'errors': {'unknownOperation': '알 수 없는 작업입니다.', 'expired': '이 확인은 만료되었습니다. 처음부터 다시 하세요.', 'tooManyAttempts': '잘못된 코드가 너무 많아 작업을 취소했습니다.',
       'wrongCode': '코드가 틀렸습니다. 확인하고 다시 입력하세요.', 'tooManyFiles': '한 번의 작업에 파일이 너무 많습니다.', 'noFreeName': '대상에 쓸 수 있는 파일 이름이 없습니다.'},
     'trash': {'title': '파일 {count}개를 휴지통으로 옮길까요?',
       'message': '파일 {count}개({size})가 휴지통으로 갑니다. 휴지통에서 복원할 수 있습니다.',
       'confirm': '휴지통으로 이동', 'summary': '파일 {count}개를 휴지통으로',
       'errors': {'noneSelected': '항목을 하나 이상 선택하세요.', 'allMissing': '파일 {count}개가 모두 더 이상 없습니다.'}},
     'organize': {'title': '항목 {count}개를 날짜별 폴더로 정리할까요?',
       'message': '항목 {count}개를 컬렉션 안의 {folders}(으)로 옮깁니다.',
       'folders': '폴더 {count}개', 'confirm': '정리', 'already': '항목 {count}개는 이미 제 폴더에 있습니다.',
       'summary': '항목 {count}개를 날짜별로 정리',
       'errors': {'noneSelected': '항목을 하나 이상 선택하세요.', 'noTheme': '폴더 주제를 입력하세요.', 'nothingToMove': '모두 제자리에 있습니다. 옮길 것이 없습니다.'}},
     'move': {'title': '파일 {count}개를 옮길까요?', 'message': '파일 {count}개가 {folder}(으)로 갑니다.',
       'related': '같은 사진의 관련 파일 {count}개를 포함합니다.',
       'confirm': '이동', 'summary': '파일 {count}개를 {folder}(으)로 이동',
       'errors': {'noneSelected': '항목을 하나 이상 선택하세요.', 'noFolder': '대상 폴더를 고르세요.', 'badName': '폴더 이름에 쓸 수 없는 문자가 있습니다.'}},
     'undo': {'title': '파일 {count}개를 복원할까요?', 'message': '실행 취소: {summary}.', 'confirm': '실행 취소',
       'errors': {'notUndoable': '이 작업은 여기서 실행 취소할 수 없습니다.', 'alreadyUndone': '이 작업은 이미 실행 취소되었습니다.', 'nothingToUndo': '그동안 파일이 옮겨지거나 바뀌어 복원할 것이 없습니다.'}},
     'backupCopy': {'titleToBackup': '파일 {count}개를 백업으로 복사할까요?',
       'titleToMaster': '파일 {count}개를 마스터로 복사할까요?',
       'message': '파일 {count}개({size})를 {folder}({folders})(으)로 복사합니다. 각 사본은 원본과 대조하며(SHA-256), 어떤 파일도 덮어쓰지 않습니다.',
       'confirm': '복사', 'summary': '파일 {count}개를 {folder}(으)로 복사'},
     'renameFile': {'title': '"{from}"을(를) "{to}"(으)로 바꿀까요?', 'message': '디스크에서 파일 이름이 바뀝니다. 미리 보기, 평가, 태그, 얼굴은 유지됩니다. 실행 취소할 수 있습니다.',
       'messageSidecars': '파일과 부속 파일 {count}개(Lightroom/DxO)의 이름이 디스크에서 바뀝니다. 사진의 미리 보기, 평가, 태그, 얼굴은 유지됩니다. 실행 취소할 수 있습니다.',
       'summary': '파일 "{from}"을(를) "{to}"(으)로 바꿈',
       'errors': {'noFile': '이 파일은 열린 컬렉션에 없습니다.', 'sameName': '파일 이름이 이미 이것입니다.', 'extension': '확장자 {ext}는 유지하세요. 이름을 바꿔도 파일이 변환되지 않습니다.'}},
     'renameFolder': {'title': '"{from}"을(를) "{to}"(으)로 바꿀까요?',
       'message': '디스크에서 폴더 {folder}의 이름이 바뀝니다. 안에 있는 항목 {count}개의 미리 보기, 평가, 태그는 유지됩니다.',
       'confirm': '이름 바꾸기', 'summary': '폴더 "{from}"을(를) "{to}"(으)로 바꿈',
       'errors': {'noFolder': '컬렉션 안의 폴더를 고르세요(컬렉션 자체의 이름은 LionPhotos 밖에서 바꿉니다).', 'badName': '\\ / : * ? " < > | 가 없고 마침표나 공백으로 끝나지 않는 이름을 쓰세요.',
                  'sameName': '폴더 이름이 이미 이것입니다.', 'exists': '거기에 이미 "{name}"(이)라는 폴더나 파일이 있습니다.'}},
     'convert': {'titleJpg': 'HEIC 사진 {count}장을 JPG로 변환할까요?',
       'titlePng': 'HEIC 사진 {count}장을 PNG로 변환할까요?',
       'message': '원본 옆에 EXIF 데이터와 색 프로필을 담은 원래 해상도의 새 파일 {count}개를 씁니다. 원본은 바뀌지 않습니다.',
       'confirm': '변환', 'summary': 'HEIC 사진 {count}장을 {format}(으)로 변환',
       'errors': {'noneSelected': 'HEIC 사진을 한 장 이상 선택하세요.'}},
     'clearCache': {'title': '미리 보기 캐시를 지울까요?', 'message': '{thumbs}와(과) {previews}({size})가 지워집니다. 사진과 동영상은 바뀌지 않으며, 미리 보기는 필요할 때 다시 만들어집니다.',
       'thumbs': '미리 보기 {count}개', 'previews': '동영상 미리 보기 {count}개', 'confirm': '캐시 지우기'}}},
}

# 1.23.0: export photos
def _merge(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict) and not set(v) <= {'one', 'other'}: _merge(a[k], v)
        else: a[k] = v
_merge(MESSAGES, {'export': {'menu': '사진 내보내기…', 'button': '사진 내보내기', 'buttonTitle': '보정과 자르기를 적용한 새 파일로 내보냅니다 (Ctrl+E)', 'eyebrow': '내보내기', 'title': '사진 {count}장 내보내기', 'edited': '{count}장에 보정이나 자르기가 있습니다.', 'noneEdited': '보정된 사진이 없습니다. 선택한 형식으로 그대로 내보냅니다.', 'skipped': '{count}개 항목(동영상이나 그릴 수 없는 형식)은 제외됩니다.', 'nothing': '내보낼 것이 없습니다. 동영상과 여기서 그릴 수 없는 형식은 제외됩니다.', 'preset': '사전 설정', 'presets': {'social': '소셜 네트워크', 'socialHint': 'JPEG 90, 1080 × 1350, 화면용 선명도, 위치 없음', 'client': '고객 전달', 'clientHint': 'JPEG 95, 원본 크기, 모든 메타데이터', 'print': '인쇄', 'printHint': 'TIFF, 원본 크기, 인쇄용 선명도, 작성자만', 'web': '웹', 'webHint': 'JPEG 85, 2048 px, 화면용 선명도, 위치 없음', 'save': '사전 설정으로 저장…', 'saveTitle': '새 내보내기 사전 설정', 'name': '이름', 'saveConfirm': '저장', 'removeHint': '오른쪽 클릭: 이 사전 설정 삭제'}, 'where': '대상', 'noFolder': '선택한 폴더가 없습니다', 'chooseFolder': '폴더 선택…', 'subfolder': '새 폴더에', 'file': '파일', 'format': '형식', 'formats': {'jpeg': 'JPEG', 'jpegHint': '화면, 소셜 네트워크, 대부분의 전달용', 'png': 'PNG', 'pngHint': '무손실, 파일이 더 큼', 'tiff': 'TIFF', 'tiffHint': '무손실, 인쇄와 다른 편집 프로그램용 (8비트)'}, 'quality': '품질', 'size': '크기', 'longSide': '긴 변 픽셀', 'sizes': {'original': '원본 크기', 'long': '긴 변…', 'igPortrait': 'Instagram 세로 (1080 × 1350)', 'story': '스토리, 릴스 (1080 × 1920)', 'hd': '풀 HD (1920 × 1080)', 'uhd': '4K (3840 × 2160)', 'print10x15': '인화 10 × 15cm (300dpi)', 'print13x18': '인화 13 × 18cm (300dpi)', 'print20x30': '인화 20 × 30cm (300dpi)'}, 'sharpen': '출력 선명도', 'sharpenOf': {'none': '없음', 'screen': '화면용', 'print': '인쇄용'}, 'names': '파일 이름', 'pattern': '이름 패턴', 'patternReset': '기본값', 'pieces': {'date': '촬영한 날 (2026-07-24)', 'work': '앨범 또는 프로젝트', 'author': '사진가 (LionPhotos의 작성자, 없으면 카메라 기록)', 'number': '내보내기 번호 (001, 002…)', 'name': '원래 파일 이름'}, 'work': '앨범 또는 프로젝트', 'workPlaceholder': '{álbum}에 쓸 이름', 'ascii': '악센트 없이', 'keepName': '원래 이름 유지', 'preview': '처음 이름들', 'noAuthorHint': '작성자가 없는 사진이 있습니다. 해당 이름에는 사진가가 들어가지 않습니다.', 'metadata': '메타데이터', 'modes': {'all': '모두', 'allHint': '카메라, 장소, 작성자, 설명', 'noGps': '위치 없음', 'noGpsHint': 'GPS를 뺀 전부: 소셜 네트워크용', 'author': '작성자만', 'authorHint': '촬영자의 이름과 직함', 'none': '없음', 'noneHint': '이미지와 색상 프로필만'}, 'watermark': '사진에 텍스트로 서명', 'watermarkText': '텍스트', 'watermarkPlaceholder': '© 사진가 이름', 'watermarkPlace': '위치', 'opacity': '불투명도', 'places': {'bottomRight': '오른쪽 아래', 'bottomLeft': '왼쪽 아래', 'topRight': '오른쪽 위', 'topLeft': '왼쪽 위', 'center': '가운데'}, 'next': '내보내기…', 'running': '사진을 내보내는 중…', 'runningN': '{total}장 중 {done}장 내보내는 중…', 'done': '사진 {count}장을 “{folder}”(으)로 내보냈습니다 ({size}).', 'cancelled': '내보내기를 취소했습니다. 이미 만든 사진은 남습니다.', 'openFolder': '폴더 열기'}, 'ops': {'export': {'undone': '내보낸 사진 {count}장이 휴지통으로 갔습니다.'}}, 'main': {'dialog': {'pickExportFolder': {'title': '내보낼 폴더'}}, 'export': {'title': '사진 {count}장 내보내기', 'message': '“{folder}”에 보정과 자르기를 적용한 새 파일을 만듭니다. 원본은 바뀌지 않습니다.', 'confirm': '내보내기', 'mode': {'all': '모든 메타데이터 포함.', 'noGps': '촬영 장소 없이.', 'author': '파일에는 작성자만 들어갑니다.', 'none': '파일에 메타데이터가 없습니다.'}, 'noAuthor': '사진 {count}장에 작성자가 없습니다.', 'skipped': '{count}개 항목은 제외됩니다.', 'summary': '사진 {count}장을 “{folder}”(으)로 내보냄', 'undoTitle': '내보낸 사진 {count}장을 휴지통으로 보낼까요?', 'undoMessage': '내보낸 파일은 휴지통으로 가고, 원본은 그대로입니다.', 'undoNothing': '내보낸 파일이 바뀌었거나 없습니다. 실행 취소할 것이 없습니다.', 'errors': {'noFolder': '내보낼 폴더를 선택하세요.', 'nothing': '내보낼 것이 없습니다.', 'readOnly': 'LionPhotos가 “{folder}”에 쓸 수 없습니다.', 'session': '이 내보내기는 끝났습니다. 다시 시작하세요.', 'full': '디스크가 가득 찼습니다.'}}}})
# 1.23.0: organize renames
_merge(MESSAGES, {'organize': {'rename': '파일 이름 바꾸기', 'renameHint': '디스크의 각 사진에 새 이름을 붙입니다. 같은 사진의 RAW, JPEG, .xmp는 같은 이름을 유지합니다.', 'namePattern': '이름 패턴', 'work': '앨범 또는 작업 ({álbum}용)', 'workPlaceholder': '예: 졸업식', 'nameExample': '첫 사진:', 'renameNote': '폴더마다 날짜순으로 번호를 붙입니다. 어떤 파일도 덮어쓰지 않으며, 실행 취소하면 이전 이름과 폴더로 돌아갑니다.', 'sameHint': '파일은 지금 폴더에 그대로 있고 새 이름만 받습니다.', 'rootFolder': '(컬렉션 폴더)', 'runRename': '{count}개 항목 이름 바꾸기', 'pattern': {'same': '폴더 유지'}}, 'main': {'ops': {'organize': {'renameMessage': '파일 {count}개가 지금 폴더에서 새 이름을 받습니다.', 'renameAlso': '파일 이름도 바뀝니다.'}}}})
# 1.24.0: reorganize the collection
_merge(MESSAGES, {'reorganize': {'introTitle': '컬렉션 전체 다시 정리', 'introLead': 'LionPhotos가 지금의 폴더 구성을 읽고 디스크에 하나의 구조를 제안합니다. 행사마다 연도 안에 폴더 하나, 긴 주제는 함께, 정리 대기와 장비 테스트는 따로 둡니다. 파일을 옮기기 전에 모두 검토할 수 있습니다.', 'introSample': '2025/2025-12-24-크리스마스 · 주제/Noah · _정리대기 · _장비', 'analyze': '컬렉션 분석', 'analyzing': '분석 중…', 'eyebrow': '다시 정리', 'title': '“{name}” 제안', 'summary': '{folders}에서 항목 {count}개를 읽었습니다.', 'foldersN': '폴더 {count}개', 'again': '다시 분석', 'close': '닫기', 'options': {'themes': {'label': '긴 주제', 'folder': '주제/ 안에', 'year': '시작한 연도에'}, 'loose': {'label': '흩어진 사진', 'events': '날짜별로 묶기', 'inbox': '_정리대기로'}, 'spheres': '개인과 업무를 최상위 폴더로'}, 'sections': {'event': '행사', 'theme': '긴 주제', 'loose': '흩어진 사진, 날짜별로 묶음', 'typed': '동영상을 해당 행사로', 'inbox': '정리 대기', 'gear': '장비 테스트', 'keep': '그대로 유지'}, 'sectionHints': {'event': '연도 / 날짜-이름', 'theme': '같은 주제가 여러 달', 'loose': '하루 넘게 쉬면 다른 묶음', 'typed': '각 파일의 날짜로', 'inbox': '폴더 이름으로', 'gear': '폴더 이름으로', 'keep': '이미 제자리이거나 사진이 아님'}, 'looseFrom': '{folder}에 흩어진 {count}개', 'destLabel': '{folder}의 새 위치', 'include': '{folder} 다시 정리', 'photos': '사진 {count}장', 'videos': '동영상 {count}개', 'items': '항목 {count}개', 'reasons': {'chosen': '이미 이 구조의 폴더에 있음', 'noPhotos': '사진 없음', 'documents': '거의 문서뿐: 옮기지 않음', 'inbox': '이름으로 보아 정리 대기', 'gear': '이름으로 보아 테스트', 'eventDay': '하루', 'eventDays': '{days}일', 'theme': '{days}일: 긴 주제', 'organized': '이미 정리됨', 'typed': '행사와 같은 날짜', 'loose': '연도나 월 폴더에 흩어져 있음', 'looseInbox': '연도나 월 폴더에 흩어져 있음'}, 'after': '정리 후', 'afterHint': '정리 후의 “{name}” (새 폴더 표시).', 'footNote': '폴더는 안의 모든 것(RAW, .xmp, 문서)과 함께 옮겨집니다. 앨범, 인물, 카테고리도 따라갑니다. 코드를 입력하는 한 번의 작업이며 실행 취소할 수 있습니다.', 'apply': '항목 {count}개 다시 정리 ({folders})…', 'nothing': '옮길 것이 없습니다'}, 'ops': {'reorganize': {'done': '컬렉션을 다시 정리했습니다: 항목 {count}개 이동 ({folders}).', 'folders': '폴더 {count}개'}}, 'main': {'ops': {'reorganize': {'errors': {'noCollection': '먼저 컬렉션을 여세요.', 'nothing': '옮길 것이 없습니다. 모두 제자리에 있습니다.', 'badName': '폴더 이름 “{name}”은(는) 사용할 수 없습니다(Windows가 거부하는 문자 또는 빈 이름).'}, 'folders': '폴더 통째로 {count}개', 'title': '컬렉션 다시 정리', 'message': '항목 {count}개가 디스크에서 위치를 옮깁니다: {folders}, {files}.', 'files': '흩어진 파일 {count}개', 'confirm': '다시 정리', 'summary': '컬렉션을 다시 정리함 ({count}건 이동)'}}}})
_merge(MESSAGES, {'main': {'ops': {'reorganize': {'dirs': {'themes': '주제', 'inbox': '_정리대기', 'gear': '_장비', 'personal': '개인', 'professional': '업무', 'loose': '흩어진사진'}}}}})
_merge(MESSAGES, {'reorganize': {'reasons': {'subject': '행사가 들어 있는 주제 폴더: 그대로 두고 안의 행사에 날짜를 붙임'}}})
# 1.24.1: progress and stop
_merge(MESSAGES, {'confirm': {'progress': '{total}개 중 {done}개 ({percent}%)', 'stop': '중지', 'stopping': '중지 중…'}, 'ops': {'stopped': '중지됨: 이미 한 작업은 그대로 남습니다(실행 취소 가능).'}, 'main': {'ops': {'organize': {'mixNote': '파일이 이름 있는 폴더 {count}개에서 나갑니다. 사진이 같은 달의 다른 사진과 섞입니다. 행사마다 폴더를 유지하려면 “컬렉션 다시 정리”를 사용하세요.'}}}})
# 1.24.2: viewer labels in the bar
_merge(MESSAGES, {'viewer': {'rawChip': '카메라 JPEG · {size}'}, 'adjust': {'viewerChip': '보정됨'}})

# 1.24.3: albums and projects in the side bar
_merge(MESSAGES, {'sidebar': {'albumsInYear': '{year}년 사진이 있는 앨범 {count}개', 'projectsInYear': '{year}년 사진이 있는 프로젝트 {count}개'}})
# 1.25.0: album suggestions
_merge(MESSAGES, {'albumSuggest': {'button': '앨범 제안', 'buttonTitle': '이벤트와 사진 내용으로 제안한 앨범 (검토용)', 'eyebrow': '제안', 'title': '제안된 앨범', 'lead': '함께 찍은 사진을 이벤트로 묶고 폴더, 사진 내용, 날짜, 장소, 등장인물로 이름을 붙입니다. 원하는 앨범을 남기고 이름을 바꾸세요. 디스크에서는 아무것도 바뀌지 않습니다.', 'again': '다시 제안', 'close': '닫기', 'working': '사진을 살펴보는 중…', 'empty': '제안 없음', 'emptyHint': '사진이 이미 앨범에 있거나 그룹이 너무 작습니다.', 'footNote': '앨범은 LionPhotos 카탈로그에만 있습니다. 사진은 제자리에 그대로 있습니다.', 'create': '앨범 {count}개 만들기', 'nothing': '선택 없음', 'created': '앨범 {count}개를 만들었습니다.', 'nameLabel': '앨범 이름', 'include': '“{name}” 만들기', 'selectAll': '모두 선택', 'selectNone': '모두 해제', 'more': '{count}개 더 보기', 'days': '{count}일', 'sections': {'event': '이벤트', 'theme': '여러 해에 걸친 주제'}, 'sectionHints': {'event': '함께 찍은 사진', 'theme': '서로 다른 날의 같은 주제'}, 'content': {'title': '사진에 담긴 것', 'none': '아직 분석하지 않았습니다. 제안은 폴더, 장소, 날짜를 바탕으로 합니다.', 'done': '{count}개 중 {done}개 분석됨.', 'running': '분석 중… {total}개 중 {done}개', 'runningHint': '끝나면 제안을 다시 만듭니다.', 'hint': '이 컴퓨터에서 썸네일로 분석합니다. 파일은 바뀌지 않으며 아무것도 전송되지 않습니다.', 'unsupported': '이 컴퓨터에는 LionPhotos가 사용할 수 있는 그래픽 카드가 없습니다. 제안은 폴더, 장소, 날짜를 바탕으로 합니다.', 'start': '사진 분석', 'more': '나머지 분석', 'pause': '일시 중지', 'resume': '계속'}, 'reasons': {'shown': '사진의 {percent}%에 {theme}', 'shownTitle': '썸네일에서 읽은 사진 내용', 'words': '이름에 {theme}', 'date': '날짜로 {theme}', 'big': '이 기간에 사진이 많음'}, 'names': {'folder': '{folder} {year}', 'folderOnly': '{folder} {year}', 'folderWhen': '{folder} · {when}', 'celebrationOf': '{person}의 {theme} {year}', 'themeDay': '{theme} · {when}', 'holiday': '{theme} {year}', 'placeWhen': '{place} · {when}', 'themeWhen': '{theme} · {when}', 'when': '{when}', 'theme': '{theme}'}, 'themes': {'wedding': '결혼식', 'birthday': '생일', 'graduation': '졸업식', 'baptism': '세례식', 'christmas': '크리스마스', 'newyear': '새해', 'carnival': '카니발', 'easter': '부활절', 'baby': '아기', 'party': '파티', 'beach': '해변', 'mountain': '산', 'snow': '눈', 'lake': '호수와 강', 'countryside': '시골', 'city': '도시', 'music': '음악과 공연', 'sport': '스포츠', 'food': '음식', 'nature': '꽃과 식물', 'wildlife': '동물', 'pets': '개와 고양이', 'cars': '자동차와 오토바이', 'planes': '비행기', 'trains': '기차', 'boats': '배', 'documents': '문서와 스크린샷'}}})
# 1.25.0: related files left behind
_merge(MESSAGES, {'regroup': {'title': '남겨진 관련 파일', 'lead': '사진을 옮기거나 이름을 바꾼 뒤 폴더에 홀로 남은 .xmp(Lightroom, Camera Raw), .dop(DxO) 등을 사진 옆으로 돌려놓고 사진과 같은 이름을 붙입니다. 어느 사진의 것인지는 작업 기록이나 .xmp 자체(RAW 파일 이름과 촬영 시각)로 판단합니다.', 'run': '찾아서 모으기…'}, 'ops': {'regroup': {'done': '관련 파일 {count}개를 사진 옆으로 돌려놓았습니다.'}}, 'main': {'ops': {'regroup': {'title': '관련 파일 {count}개를 사진 옆으로 돌려놓을까요?', 'message': '각 파일은 사진의 폴더로 옮겨지고 사진과 같은 이름이 됩니다(RAW 편집 내용은 그대로). 되돌릴 수 있습니다.', 'confirm': '모으기', 'summary': '관련 파일 {count}개를 사진 옆으로 돌려놓음', 'unmatched': '나머지 {count}개는 사진을 확실히 알 수 없어 그대로 둡니다.', 'errors': {'none': '남겨진 관련 파일이 없습니다. 모든 .xmp와 .dop가 사진 옆에 있습니다.', 'noneMatched': '관련 파일 {count}개가 남겨져 있지만 사진을 확실히 알 수 없어 옮길 것이 없습니다.'}}}}})
# 1.26.0: short dates, countries and continents in album names
_merge(MESSAGES, {'albumSuggest': {'names': {'folderWhen': '{folder} {when}', 'themeDay': '{theme} {when}', 'placeWhen': '{place} {when}', 'themeWhen': '{theme} {when}', 'countryWhen': '{country} {when}', 'twoCountriesWhen': '{country}와{country2} {when}', 'continentWhen': '{continent} {when}'}, 'continents': {'africa': '아프리카', 'antarctica': '남극', 'asia': '아시아', 'europe': '유럽', 'northAmerica': '북아메리카', 'centralAmerica': '중앙아메리카', 'southAmerica': '남아메리카', 'oceania': '오세아니아'}}})
# 1.26.1: people in album names
_merge(MESSAGES, {'albumSuggest': {'names': {'celebrationOf': '{theme} · {who} {year}', 'themeDayWho': '{theme} · {who} {when}', 'themeWhenWho': '{theme} · {who} {when}', 'placeWhenWho': '{place} · {who} {when}', 'countryWhenWho': '{country} · {who} {when}', 'twoCountriesWhenWho': '{country}와{country2} · {who} {when}', 'continentWhenWho': '{continent} · {who} {when}', 'whoWhen': '{who} {when}', 'whoYear': '{who} {year}'}, 'both': '{a}와{b}', 'sections': {'person': '한 해 동안의 인물'}, 'sectionHints': {'person': '한 해의 여러 달에 등장하는 사람'}, 'months': '{count}개월'}})
# 1.26.1: preview of a suggestion
_merge(MESSAGES, {'albumSuggest': {'preview': {'open': '모든 사진을 크게 보기', 'button': '사진 보기', 'toggle': '클릭: 앨범에서 빼기(되돌리기) · 두 번 클릭: 열기', 'zoom': '크게 열기', 'hint': '사진을 클릭하면 뺄 수 있습니다', 'keepAll': '모두 유지', 'done': '완료', 'removedCount': '{count}장 제외'}}})
# 1.26.2: merge two albums
_merge(MESSAGES, {'albums': {'merge': {'button': '다른 앨범과 합치기…', 'title': '“{name}” 합치기', 'lead': '“{name}”의 항목 {count}개가 선택한 앨범으로 옮겨지고 “{name}”은(는) 없어집니다.', 'with': '합칠 앨범', 'search': '앨범 찾기', 'noMatch': '그 이름의 앨범이 없습니다', 'name': '합친 앨범 이름', 'summary': '항목 {count}개가 됩니다.', 'summaryCommon': '항목 {count}개가 됩니다(두 앨범에 모두 있던 {common}).', 'note': '카탈로그만 바뀌고 파일은 옮겨지지 않습니다. 선택한 앨범의 설명, 표지, 프로젝트는 그대로이며 없는 것은 “{name}”에서 가져옵니다.', 'confirm': '합치기', 'done': '“{from}”을(를) “{name}”에 합쳤습니다.', 'undo': '실행 취소', 'undone': '“{from}”을(를) 다시 분리했습니다.', 'noOther': '합칠 다른 앨범이 없습니다.'}}})
# 1.27.0: album cards with less on them
_merge(MESSAGES, {'albums': {'more': '추가 작업', 'editMenu': '이름과 설명 편집…', 'exportMenu': '사진 내보내기…', 'sizeTitle': '디스크에서 {size}'}})
# 1.28.0: timeline, album mosaic, duplicate
_merge(MESSAGES, {'photos': {'timeline': '타임라인', 'mosaicOn': '모자이크로 보기', 'mosaicOff': '격자로 보기', 'duplicate': '복제'}, 'ops': {'duplicate': {'done': '사본 {count}개를 만들었습니다.', 'undone': '사본 {count}개를 휴지통으로 보냈습니다.'}}, 'main': {'duplicate': {'suffix': '사본', 'title': '항목 {count}개 복제', 'message': '같은 폴더에 사본을 만듭니다(총 {size}). 원본의 조정, 자르기, 표시, 설명, 앨범도 함께 가져갑니다. 원본은 바뀌지 않습니다.', 'sidecars': '사진과 함께 있는 .xmp 또는 .dop 파일 {count}개도 같은 새 이름으로 복사합니다.', 'note': '실행 취소할 수 있습니다: 사본은 휴지통으로 갑니다.', 'skipped': '항목 {count}개는 디스크에서 찾을 수 없어 제외합니다.', 'confirm': '복제', 'nothing': '복제할 것이 없습니다: 파일을 찾을 수 없습니다.', 'summary': '항목 {count}개 복제', 'undoTitle': '사본 {count}개를 휴지통으로 보낼까요?', 'undoMessage': '복제로 만든 사본을 휴지통으로 보냅니다. 원본은 그대로입니다.', 'undoNothing': '사본이 바뀌었거나 없습니다: 실행 취소할 것이 없습니다.'}}})
# 1.28.1: change an album's cover
_merge(MESSAGES, {'albums': {'cover': {'menu': '표지 바꾸기…', 'title': '“{name}” 표지', 'lead': '사진 {count}장 중에서 앨범 표지를 고르세요(두 번 클릭하면 바로 사용).', 'none': '이 앨범에는 표지로 쓸 미리보기가 있는 사진이 없습니다.', 'auto': '첫 사진', 'autoTitle': '표지를 앨범의 첫 사진으로 되돌립니다', 'done': '“{name}” 표지를 바꿨습니다.'}}})
# 1.28.1: find an album by name
_merge(MESSAGES, {'albums': {'searchPlaceholder': '이름으로 앨범 찾기', 'searchNone': '그 이름의 앨범이 없습니다. 아래에서 새로 만들 수 있습니다.'}})
# 1.29.0: places from the photos
_merge(MESSAGES, {'places': {'fromPhotos': '사진에서', 'fromPhotosHint': '각 사진에서 읽었습니다: LionPhotos나 파일에 적힌 장소(도시, 주, 국가), 없으면 GPS 위치(이 컴퓨터에서 처리). 바꾸려면 사진의 장소를 바꾸세요(설명 › 장소).', 'yours': '직접 만든 장소', 'noCountry': '국가 알 수 없음', 'fromPhoto': '사진에서', 'fromPhotoTitle': '사진의 장소나 GPS에서 읽음: 바꾸려면 사진을 바꾸세요', 'howTo': '장소는 사진의 GPS와 장소(도시, 국가)에서 자동으로 나타납니다. 위에서 직접 만들고 폴더나 선택한 사진에 “라벨…”을 쓸 수도 있습니다.'}})
# 1.30.0: the catalog kept with the collection
_merge(MESSAGES, {'portable': {'title': '컬렉션과 함께 두는 카탈로그', 'lead': '앨범, 프로젝트, 인물과 얼굴, 장소, 분류, 표시, 설명, 조정과 자르기가 컬렉션의 숨김 폴더 “.lionphotos”에도 저장됩니다. 다른 컴퓨터나 다른 드라이브 문자로 연결한 이 드라이브에서도 모두 그대로 열립니다.', 'switch': '컬렉션에 저장', 'switchTitle': '끔: 카탈로그는 이 컴퓨터에만 둡니다', 'off': '이 컴퓨터에만 저장합니다.', 'saved': '컬렉션 폴더가 최신입니다({when}, {size}).', 'read': '컬렉션 폴더에서 읽었습니다: {when}에 “{by}”에서 저장.', 'readOnly': '컬렉션 폴더에 쓸 수 없습니다(읽기 전용). 카탈로그는 이 컴퓨터에 남습니다.', 'full': '드라이브가 가득 차서 카탈로그를 쓰지 못했습니다.', 'newer': '이 컬렉션의 카탈로그는 더 새로운 LionPhotos로 저장되었습니다. 읽으려면 LionPhotos를 업데이트하세요. 덮어쓰지 않았습니다.', 'error': '카탈로그를 컬렉션에 쓰지 못했습니다: {error}', 'pending': '저장을 기다리는 변경이 있습니다…', 'pendingShort': '변경 대기 중', 'waiting': '다음 변경 후 폴더에 씁니다.', 'saveNow': '지금 저장', 'reveal': '폴더 보기', 'imported': '이 컬렉션의 카탈로그를 폴더에서 읽었습니다({when}에 “{by}”에서 저장).', 'importedKept': '이 컬렉션의 카탈로그를 폴더에서 읽었습니다({when}에 “{by}”에서 저장). 이 컴퓨터의 저장되지 않은 변경은 .lionphotos/conflicts에 남겼습니다.'}})
# 1.31.0: the places on a world map
_merge(MESSAGES, {'places': {'map': {'open': '지도에서 보기', 'openTitle': '장소를 세계 지도에서 열기', 'countries': '{count}개 국가', 'mode': '지도', 'label': '사진 장소의 세계 지도', 'zoomIn': '확대', 'zoomOut': '축소', 'fit': '모든 장소 보기', 'credit': '국경: Natural Earth · 도시: GeoNames · 이 컴퓨터에서 그림', 'group': '장소 {count}곳 · {items}', 'more': '그 외 {count}곳', 'shown': '지도에 장소 {count}곳.', 'none': '아직 위치가 있는 장소가 없습니다. 장소는 사진의 GPS와 장소 정보에서 만들어집니다.', 'unplaced': '{count}곳은 위치를 알 수 없습니다.', 'manual': '직접 만든 장소 {count}곳은 위치가 없어 지도에 나오지 않습니다.'}}})

# 1.32.0: highlights — the photos marked great or OK
_merge(MESSAGES, {'showcase': {'mode': '하이라이트', 'open': '고른 사진 보기', 'openTitle': '{name}에서 별표나 OK로 표시한 사진 열기', 'of': '전체 {count}', 'prev': '이전 고른 사진', 'next': '다음 고른 사진', 'empty': '아직 고른 사진이 없습니다', 'howTo': '좋은 사진에 별표(1)나 OK(2)를 표시하면, 그 사진이 들어 있는 앨범, 인물, 반려동물, 프로젝트가 고른 사진과 함께 여기에 나타납니다.', 'lead': '별표나 OK로 표시한 사진이 있는 항목 {count}개, 최근 순.'}, 'marks': {'picks': '별표와 OK'}})
_merge(MESSAGES, {'showcase': {'alsoIn': '다른 곳에도'}})

# 1.34.0: highlights inside a label
_merge(MESSAGES, {'photos': {'spotOn': '하이라이트: 별표나 OK 사진만 크게', 'spotOff': '모든 사진으로 돌아가기'}, 'showcase': {'photoEmpty': '여기에는 별표나 OK로 표시한 사진이 없습니다', 'photoHowTo': '좋은 사진에 별표(1)나 OK(2)를 표시하면 여기에 크게 차례로 나타납니다.', 'photoOpen': '열기', 'photoLead': '별표나 OK로 표시한 사진 {count}장.'}})

# 1.35.0: raw development (16 bits)
_merge(MESSAGES, {'adjust': {'raw': {'noteOff': 'RAW 사진: 보정은 카메라가 파일 안에 저장한 JPEG(8비트)에 적용되며, RAW 데이터에는 적용되지 않습니다. 원본 파일은 절대 바뀌지 않습니다.', 'noteOn': 'RAW 현상: 보정은 이 컴퓨터에서 16비트로 현상한 센서 데이터에 적용됩니다. 원본 파일은 절대 바뀌지 않습니다.', 'switch': '16비트 RAW 데이터에서 편집(현상 모드)', 'hint': '카메라의 화이트 밸런스에서 시작해 하이라이트와 그림자를 더 많이 살릴 수 있습니다. 현상한 사진은 여는 데 약 1초, 내보내는 데 몇 초가 걸립니다.', 'noGpu': '그래픽 카드(WebGL 2)가 필요하지만 여기서는 사용할 수 없습니다.', 'developing': 'RAW 현상 중…', 'failed': 'RAW를 현상할 수 없습니다: {error}'}}, 'viewer': {'rawDeveloped': '16비트로 현상', 'rawDevelopedTitle': '센서 데이터로 그렸으며, 이 컴퓨터에서 16비트로 현상했습니다(LibRaw). 전후 비교(Y)로 카메라 JPEG와 비교할 수 있습니다.'}})

# 1.36.0: the search of the title bar
_merge(MESSAGES, {'gs': {'placeholder': '{folder}에서 검색 — 사진, 사진가, 장소, 앨범…', 'label': '컬렉션 전체 검색(Ctrl+K)', 'hint': '파일 이름, 사진가, 카메라, 장소, 앨범, 프로젝트, 인물, 반려동물, 키워드, 설명으로 검색하세요.', 'keys': '↑ ↓ 선택 · Enter 열기 · Esc 닫기', 'openFolder': '다른 폴더 열기', 'noPhotos': '“{q}”이(가) 들어간 사진이 없습니다', 'empty': '사진 없음', 'allPhotos': '“{q}”이(가) 들어간 사진 {count}장 모두 사진에서 보기', 'group': {'photos': '사진', 'album': '앨범', 'project': '프로젝트', 'person': '인물', 'pet': '반려동물', 'place': '장소', 'authors': '사진가', 'cameras': '카메라', 'keywords': '키워드', 'folders': '폴더'}}})

# 1.36.0: why nothing is shown
_merge(MESSAGES, {'photos': {'why': {'query': '검색 “{q}”이(가) 켜져 있습니다', 'year': '{year}년만', 'videos': '동영상만', 'images': '사진만', 'mark': '표시 “{mark}”만', 'category': '카테고리 “{name}”만', 'sphere': '“{name}”만(제목 표시줄)', 'noAlbum': '앨범에 없는 사진만', 'thisFolder': '이 폴더만(하위 폴더 제외)', 'titleIn': '“{name}”에 필터와 맞는 항목이 없습니다', 'hiddenIn': '{count}개 항목이 있지만 아래 필터에 가려져 있습니다.', 'hidden': '여기에 {count}개 항목이 있지만 아래 필터에 가려져 있습니다.', 'without': '빼면: {count}개', 'remove': '빼기', 'removeAll': '모든 필터 빼기'}}})

# 1.36.0: albums in an even grid
_merge(MESSAGES, {'albums': {'modeMosaic': '모자이크', 'modeEven': '균일한 격자'}})
_merge(MESSAGES, {'photos': {'clearSearch': '검색 지우기'}})
# 1.37.0: lens correction (Lensfun profiles)
_merge(MESSAGES, {'adjust': {'group': {'lens': '렌즈'}, 'lensDist': '왜곡', 'lensVig': '비네팅', 'lensCa': '색수차'}, 'lens': {'summary': '렌즈 보정됨', 'switch': '렌즈 보정', 'choose': '프로필 선택…', 'hint': '렌즈 프로필(Lensfun)로 왜곡, 어두운 모서리, 색수차를 보정합니다. 파일은 바뀌지 않습니다.', 'hintOn': '슬라이더: 0은 측정된 그대로, + 더 강하게, − 더 약하게. 프로필이 없으면 수동 보정: +는 배럴 왜곡을 펴고 모서리를 밝게 합니다.', 'noGpu': '그래픽 카드(WebGL)가 필요하지만 여기서는 사용할 수 없습니다.', 'failed': '렌즈를 보정하지 못했습니다: {error}', 'sensor': '센서 {crop}×', 'noProfileFor': '“{lens}”의 프로필이 없습니다. 슬라이더로 보정하거나 프로필을 선택하세요.', 'noProfile': '사진에 렌즈 정보가 없습니다. 슬라이더로 보정하거나 프로필을 선택하세요.', 'manyProfiles': '{total}장 중 {count}장에 프로필 있음', 'distortion': '왜곡', 'vignetting': '비네팅', 'fringes': '색수차', 'searchPlaceholder': '이름, 제조사, 마운트로 검색 (예: RF 16, Sigma 150-600, Nikon Z)', 'search': '렌즈 프로필 검색', 'profiles': '렌즈 프로필', 'none': '없음 — 수동 보정', 'noneDetail': '슬라이더로 보정합니다', 'fits': '같은 초점 거리', 'more': '{count}개 중 처음 {shown}개: 더 입력해 좁히세요', 'use': '이 프로필 사용', 'correction': '렌즈 보정', 'pickTitle': '렌즈 프로필 선택', 'cameraSays': '카메라 기록: {lens}', 'credit': 'Lensfun(lensfun.github.io)의 렌즈 프로필 {count}개, CC BY-SA 3.0.', 'found': '프로필 {count}개', 'forMany': '사진 {count}장'}})
# 1.37.0: lens corrections by hand
_merge(MESSAGES, {'adjust': {'manDist': '왜곡', 'manVert': '세로', 'manHorz': '가로', 'manScale': '크기', 'manVig': '모서리', 'manMid': '중간점', 'manCaR': '빨강/청록', 'manCaB': '파랑/노랑', 'lensDist': '프로필 왜곡', 'lensVig': '프로필 비네팅', 'lensCa': '프로필 색수차'}, 'lens': {'switch': '렌즈 프로필로 보정', 'hintOn': '프로필 슬라이더: 0은 측정된 그대로, + 더 강하게, − 더 약하게.', 'manual': '보정', 'manualReset': '초기화', 'manualHint': '프로필이 있든 없든 사용할 수 있습니다. +는 배럴 왜곡을 펴고, 위쪽이나 오른쪽을 넓히고, 모서리를 밝게 합니다. 슬라이더를 두 번 클릭하면 0으로 돌아갑니다.', 'geometry': '기하', 'corners': '모서리', 'fringesTitle': '색수차', 'noProfileFor': '“{lens}”의 프로필이 없습니다. 아래에서 수동으로 보정하거나 프로필을 선택하세요.', 'noProfile': '사진에 렌즈 정보가 없습니다. 아래에서 수동으로 보정하거나 프로필을 선택하세요.'}})
_merge(MESSAGES, {'adjust': {'manVig': '양'}})
# 1.37.0: .xmp alongside JPEG too
_merge(MESSAGES, {'main': {'meta': {'write': {'both': '이미지 안과 옆의 {name}', 'noteInside': 'JPEG: 메타데이터를 파일 안에 기록해 사진을 보낼 때 함께 전달되게 합니다(이미지 자체는 바뀌지 않으며 이전 버전은 휴지통으로). 옆의 .xmp 파일에도 기록합니다.'}}}})
# recovery copy (1.37.1)
_merge(MESSAGES, {'describe': {'safeCollection': '입력하는 즉시 저장: 카탈로그에 저장하고, 컬렉션 폴더(.lionphotos)에 복구용 사본을 자동으로 기록합니다. 사진 파일은 기록을 요청할 때만 바뀝니다.', 'safeLocal': '입력하는 즉시 이 컴퓨터의 카탈로그에 저장합니다. 사진 파일은 기록을 요청할 때만 바뀝니다.', 'safeWhen': '복구용 사본 기록: {when}', 'notInFile': '아직 파일에 없는 항목: {count}개', 'inFile': '파일에 이미 이 데이터가 있습니다.', 'writeHint': '이 메타데이터와 표시(별점으로)를 파일에 기록합니다(다른 프로그램과 전송용). JPEG는 안과 옆의 .xmp에, 다른 형식은 옆의 .xmp에'}, 'main': {'meta': {'write': {'message': '지금까지 이 변경은 카탈로그(와 복구용 사본)에만 있었습니다. 이제 메타데이터(작가, 캡션, 음성 설명, 장소, 키워드 등)와 표시(별점)를 파일 자체에 기록합니다. 다른 프로그램과 전송용입니다.'}}}})
# 1.38.0: Watermelon and City blue
_merge(MESSAGES, {'statusbar': {'themeTeal': '수박', 'themeTealTitle': '수박 테마 — 로고의 청록색, 분홍, 흰색', 'themeCity': '시티 블루', 'themeCityTitle': '시티 블루 테마 — 도시 계획도처럼 코발트, 코랄, 흰색'}})

# 1.39.0: new versions, only when asked (the version in the bottom-right corner)
_merge(MESSAGES, {'update': {'status': {'title': 'LionPhotos 버전 — 클릭하여 새 버전 확인', 'checking': '새 버전을 확인하는 중…', 'currentTitle': '최신 버전을 사용 중입니다. 클릭하면 자세히 볼 수 있습니다.', 'errorTitle': '새 버전을 확인하지 못했습니다. 클릭하여 다시 시도하세요.', 'available': '새 버전 {version}', 'availableTitle': '{version} 버전을 사용할 수 있습니다. 클릭하여 업데이트하세요.'}, 'dialog': {'installed': '설치된 버전', 'newVersion': '새 버전', 'availableTitle': '새 버전을 사용할 수 있습니다', 'howInstaller': 'LionPhotos가 닫히고, 설치 프로그램이 새 버전을 내려받아 검증·설치한 뒤 다시 엽니다. 설정과 카탈로그는 유지됩니다.', 'howScript': 'LionPhotos가 닫히고, 설치 프로그램(PowerShell)이 새 버전을 내려받아 검증·설치합니다. 설정과 카탈로그는 유지됩니다.', 'howDownload': '새 버전의 다운로드 페이지가 브라우저에서 열립니다. 사용 중인 시스템용 설치 프로그램을 내려받아 실행하세요. 설정과 카탈로그는 유지됩니다.', 'question': '지금 업데이트할까요?', 'whatsNew': '이 버전의 새로운 기능 보기', 'updateNow': '지금 업데이트', 'openDownload': '다운로드 페이지 열기', 'notNow': '나중에', 'checking': '새 버전을 확인하는 중…', 'currentTitle': 'LionPhotos가 최신 상태입니다', 'currentText': '최신 버전을 사용 중입니다.', 'errorTitle': '확인하지 못했습니다', 'errorText': '인터넷 연결을 확인한 뒤 다시 시도하세요.', 'checkAgain': '다시 확인', 'closing': '업데이트를 위해 LionPhotos를 닫는 중…', 'howDmg': '새 버전(.dmg)을 다운로드 폴더에 내려받아 검증한 뒤 열고, LionPhotos는 닫힙니다. LionPhotos를 응용 프로그램으로 드래그하고 대치를 선택하세요. 설정과 카탈로그는 유지됩니다.', 'howSh': 'LionPhotos가 닫히고, 설치 프로그램(install.sh)이 새 버전을 내려받아 검증·설치한 뒤 다시 엽니다. 설정과 카탈로그는 유지됩니다.', 'howAppImage': '새 AppImage를 내려받아 검증한 뒤 현재 파일을 대체하고 엽니다. 설정과 카탈로그는 유지됩니다.', 'howDeb': '새 패키지(.deb)를 다운로드 폴더에 내려받아 검증한 뒤 시스템의 소프트웨어 설치 프로그램에서 엽니다. 설치할 때 암호를 묻습니다. 그다음 LionPhotos를 다시 여세요. 설정과 카탈로그는 유지됩니다.', 'howRpm': '새 패키지(.rpm)를 다운로드 폴더에 내려받아 검증한 뒤 시스템의 소프트웨어 설치 프로그램에서 엽니다. 설치할 때 암호를 묻습니다. 그다음 LionPhotos를 다시 여세요. 설정과 카탈로그는 유지됩니다.', 'downloading': '새 버전을 내려받아 검증하는 중…', 'progress': '{name}: {done} / {total}', 'progressNoTotal': '{name}: {done}', 'preparing': '새 버전의 파일을 가져오는 중…', 'closingDmg': 'LionPhotos를 닫는 중: 열린 창에서 응용 프로그램으로 드래그하고 대치를 선택하세요.', 'privacy': 'LionPhotos는 이 창을 열 때만 인터넷에 연결합니다. GitHub에 게시된 버전의 작은 파일을 읽습니다. 업데이트하면 시스템용 설치 프로그램을 내려받아 사용하기 전에 검증(SHA-256)합니다. 사용자나 사진에 관한 데이터는 전송되지 않습니다.'}, 'failed': '업데이트를 시작하지 못했습니다: {error}', 'downloadOpened': '브라우저에서 다운로드 페이지를 열었습니다.', 'packageOpened': '새 버전을 시스템 설치 프로그램에서 열었습니다. 설치한 뒤 LionPhotos를 다시 여세요.', 'saved': '새 버전은 {file}에 있습니다. 열어서 설치하세요.', 'error': {'checksum': '내려받은 파일이 게시된 체크섬과 일치하지 않아 삭제했습니다', 'network': 'GitHub에 연결할 수 없습니다 — 인터넷 연결을 확인하세요'}}})

# 1.40.0: the panel by task (tabs, two panels in a wide viewer)
_merge(MESSAGES, {'panel': {'tab': {'adjust': '조정', 'describe': '설명', 'info': '정보'}, 'tabs': '패널에 표시할 내용', 'describeInfo': '설명 및 정보', 'oneTitle': '패널 하나(조정, 설명, 정보를 탭으로)', 'twoTitle': '패널 두 개: 왼쪽에 설명 및 정보, 오른쪽에 조정', 'resize': '드래그하여 패널 너비 조정(두 번 클릭: 기본 너비로)'}, 'describe': {'safeShort': '카탈로그에 저장됨'}})

_merge(MESSAGES, {'viewer': {'editTitle': '편집 패널 표시 또는 접기: 분류, 앨범, 보정, 설명, 작가와 장소(H)'}})

# 1.40.1: all the photos of the day
_merge(MESSAGES, {'info': {'dayAll': '이 날의 모든 사진 보기', 'dayTitle': '여기서 나가 {day}의 모든 사진과 동영상을 사진에서 표시합니다'}, 'photos': {'clearDay': '모든 날짜 표시', 'why': {'day': '{day}의 사진만'}}})

_merge(MESSAGES, {'info': {'dayAll': '이 날의 사진'}})

# 1.41.0
_merge(MESSAGES, {'intro': {'help': '이 페이지의 용도', 'gotIt': '알겠습니다'}})

_merge(MESSAGES, {'adjust': {'holdOriginal': '누르고 있으면 원본 표시'}, 'labels': {'emptyFind': {'person': '이 컴퓨터에서 LionPhotos가 사진 속 인물을 찾도록 하세요.', 'pet': '이 컴퓨터에서 LionPhotos가 사진 속 반려동물을 찾도록 하세요.'}, 'emptyOr': '또는 위 입력란에서 직접 만드세요.'}})

_merge(MESSAGES, {'reorganize': {'reasons': {'backup': '사본: 이름으로 판단({count}장 중 {twins}장이 다른 곳에도 있음) — 그대로 둠', 'copies': '사본: {count}장 중 {twins}장이 다른 폴더에도 있음 — 그대로 둠'}, 'seeDuplicates': '중복 파일 보기'}})

_merge(MESSAGES, {'keys': {'title': '키보드 단축키', 'search': '전체 컬렉션 검색', 'open': '폴더 열기', 'refresh': '새 파일과 변경된 파일 찾기', 'views': '사진 · 앨범 · 림보', 'sidebar': '사이드바 · 사진만 보기', 'undo': '실행 취소 · 다시 실행', 'back': '앨범에서 돌아가기 · 전체 컬렉션', 'this': '이 목록', 'marks': '최고 · OK · 삭제 후보 · 표시 지우기', 'select': '열기 · 모두 선택 · 선택 해제', 'files': '이름 바꾸기 · 복제 · 내보내기', 'compare': '나란히 비교', 'tabs': '조정 · 설명 · 정보(다시 누르면 접힘)', 'hide': '패널 표시 또는 숨기기', 'nav': '이전 · 다음 · 처음 · 마지막', 'zoom': '맞춤 ↔ 실제 크기 · 확대 · 축소', 'edit': '자르기 · 전후 비교 · 누르고 있으면 원본', 'show': '슬라이드쇼 · 전체 화면 · 앨범에 추가', 'viewerMore': '다음 사진과 비교 · 내보내기', 'limbo': '림보로 보내기', 'close': '닫기', 'button': '키보드 단축키 (?)', 'group': {'everywhere': '모든 화면', 'photos': '사진', 'panel': '사이드 패널', 'viewer': '뷰어'}}, 'compare': {'title': '나란히 비교', 'hint': '← → 표시된 쪽의 사진 변경 · Tab 쪽 전환 · 1 2 3 표시 · 휠로 두 사진 함께 확대', 'left': '왼쪽 사진', 'right': '오른쪽 사진', 'prev': '이전 사진', 'next': '다음 사진', 'menu': '나란히 비교', 'viewerTitle': '다음 사진과 비교'}})

_merge(MESSAGES, {'export': {'more': '옵션 더 보기', 'less': '옵션 접기'}})

_merge(MESSAGES, {'backup': {'catalog': {'current': '카탈로그(앨범, 인물, 표시, 설명, 조정)도 백업에 있습니다({when} 기준).', 'older': '백업에 있는 카탈로그 사본이 오래되었습니다({when}). 이후에 만든 앨범, 인물, 조정은 들어 있지 않습니다.', 'missing': '백업에 카탈로그 사본이 없습니다. 사진은 있지만 앨범, 인물, 설명, 조정은 없습니다.', 'copy': '카탈로그를 백업에 복사', 'copied': '카탈로그를 백업에 복사했습니다.'}}, 'portable': {'locked': '{by}에서 열려 있습니다({when}부터). 그쪽에서 닫을 때까지 여기서는 컬렉션 폴더에 아무것도 기록하지 않습니다. 여기서 한 작업은 이 컴퓨터의 카탈로그에 남고 나중에 폴더에 기록됩니다.', 'takeOver': '그래도 여기서 사용', 'takeOverTitle': '이 컴퓨터에서 컬렉션 폴더에 기록합니다. 다른 컴퓨터에서 LionPhotos가 실제로 열려 있지 않을 때만 사용하세요.', 'lockedToast': '이 컬렉션은 다른 컴퓨터({by})에서 열려 있습니다. 그쪽에서 닫을 때까지 여기서 한 작업은 이 컴퓨터의 카탈로그에 남습니다.'}})

_merge(MESSAGES, {'albums': {'setAsCover': '앨범 표지로 설정'}})

_merge(MESSAGES, {'about': {'short': '정보'}})

_merge(MESSAGES, {'sidebar': {'hide': '탐색 숨기기 ({key})', 'show': '탐색 표시 ({key})'}})

_merge(MESSAGES, {'plugins': {'which': {'label': '내보낼 사진', 'all': '전체', 'good': '우수와 OK', 'great': '우수만'}, 'view': {'ofTotal': '{total} 중 {n}', 'noneWhich': '이 표시가 있는 사진이 없습니다', 'preview': '미리 보기', 'previewTitle': '내보낼 사진 보기', 'open': '열기', 'openTitle': '“{name}”을(를) 사진에서 열어 확인하고 변경합니다. 뒤로를 누르면 이 페이지로 돌아옵니다.'}, 'preview': {'count': '내보내기: {total} 중 {n}', 'more': '외 {n}', 'cover': '표지'}}})

_merge(MESSAGES, {'plugins': {'same': {'title': {'one': '이름이 같은 사진 {count}쌍', 'other': '이름이 같은 사진 {count}쌍'}, 'text': '페이지에서는 한 이름에 사진이 두 장이 됩니다. 각각 어느 것을 내보낼지 선택하세요. 다른 하나는 이번 내보내기에서 빠집니다.', 'raw': 'RAW: JPG로 변환하여 내보냄', 'continue': '계속'}}})

_merge(MESSAGES, {'places': {'sphereEmpty': '“{sphere}”에는 장소가 있는 파일이 없습니다.', 'sphereTable': '각 범주의 장소', 'sphereFiles': {'one': '장소가 있는 파일 {count}개', 'other': '장소가 있는 파일 {count}개'}, 'spherePlaces': {'one': '장소 {count}개', 'other': '장소 {count}개'}, 'sphereShow': '보기', 'sphereHere': '현재 열림'}})

_merge(MESSAGES, {'sidebar': {'otherFolders': '이전에 연 다른 폴더'}, 'showcase': {'albumsNoPicks': '이 앨범들에는 아직 별표나 OK가 붙은 사진이 없어 하이라이트가 없습니다. 앨범은 모자이크처럼 표시됩니다. 좋은 사진에 표시(1 또는 2)를 하면 여기에 나타납니다.'}})

_merge(MESSAGES, {'showcase': {'modeTitle': '하이라이트: 별표나 OK가 붙은 사진이 있는 것만', 'only': '하이라이트에는 별표나 OK가 붙은 사진이 있는 것만 표시됩니다: {total}개 중 {shown}개, 최근 순.', 'all': '모두 보기', 'albumsNoPicks': '이 앨범들에는 아직 별표나 OK가 붙은 사진이 없습니다. 하이라이트에는 별표나 OK가 붙은 사진이 있는 앨범만 표시되므로, 지금은 모자이크처럼 표시합니다. 좋은 사진에 표시(1 또는 2)를 하면 여기에 나타납니다.'}})

_merge(MESSAGES, {'statusbar': {'eta': {'estimating': '남은 시간 계산 중…', 'lessMinute': '1분 미만 남음', 'minutes': {'one': '약 1분 남음', 'other': '약 {count}분 남음'}, 'hours': {'one': '약 1시간 남음', 'other': '약 {count}시간 남음'}, 'hoursMinutes': '약 {hours}시간 {minutes}분 남음'}}})

_merge(MESSAGES, {'statusbar': {'thumbsKept': '미리보기 이미지는 카탈로그에 보관되며 다시 만들지 않습니다: {kept}개는 이미 준비되었고, 없는 {missing}개만 만들고 있습니다.'}})

_merge(MESSAGES, {'dupes': {'etaStep': '이 단계 {eta}'}})

_merge(MESSAGES, {'trashlog': {'byRoot': '루트 폴더별', 'byRootHint': '드라이브나 폴더마다 보낸 양과 전체 합계입니다. 하나를 클릭하면 아래에 그것만 표시됩니다.', 'rootAll': '모든 루트 폴더', 'rootUnknown': '기록되지 않은 루트 폴더', 'col': {'root': '루트 폴더', 'sent': '휴지통으로 보냄', 'limbo': '림보로 확보한 공간', 'dups': '중복 파일'}}})

_merge(MESSAGES, {'overview': {'cache': 'LionPhotos가 사용하는 공간', 'cacheHint': '미리보기 이미지와 미리보기는 한 번 만들어 카탈로그에 보관하며, 파일이 바뀔 때만 다시 만듭니다. 사진 자체는 포함하지 않습니다.', 'space': {'thumbsTotal': '미리보기 이미지와 미리보기', 'fileTotal': '이 컴퓨터의 카탈로그 파일', 'photoThumbs': '사진 미리보기 이미지', 'videoThumbs': '동영상 미리보기 이미지', 'adjusted': '보정한 사진의 미리보기 이미지', 'byRoot': '루트 폴더별', 'rootTotal': '합계', 'portable': '.lionphotos', 'portableTitle': '사진과 함께 보관된 카탈로그. 각 루트 폴더의 숨김 폴더 .lionphotos에 있습니다(드라이브가 연결되지 않으면 —)'}}, 'settings': {'space': '사용 공간', 'spaceLoading': '측정 중…', 'spaceLine': '미리보기 이미지와 미리보기: {thumbs} · 카탈로그 파일: {file}', 'spaceDetails': '자세히'}})

_merge(MESSAGES, {'places': {'noCity': {'one': '도시 정보 없는 항목 {count}개', 'other': '도시 정보 없는 항목 {count}개'}, 'noCityTitle': '국가는 있지만 도시는 없는 사진입니다(오프라인 목록의 도시에서 먼 GPS 또는 파일에 국가만 있음). 버튼은 그 나라의 모든 사진을 보여 줍니다.'}})

_merge(MESSAGES, {'dupes': {'showAll': '모든 사본 보기'}})

_merge(MESSAGES, {'albumSuggest': {'scanning': {'one': '폴더를 아직 읽는 중입니다. 이 제안은 지금까지 읽은 파일 {count}개를 바탕으로 합니다. 끝나면 다시 제안하여 모두 사용하세요.', 'other': '폴더를 아직 읽는 중입니다. 이 제안은 지금까지 읽은 파일 {count}개(와 이 컴퓨터가 이미 알고 있던 정보)를 바탕으로 합니다. 끝나면 다시 제안하여 모두 사용하세요.'}}})

_merge(MESSAGES, {'views': {'todo': '편집 대기'}, 'keys': {'todo': '편집 대기'}, 'todo': {'lead': '표지에 연필 표시를 한 앨범과 프로젝트를 작업할 순서대로 보여 줍니다. 맨 위가 먼저 할 일입니다. 끌어서(또는 화살표로) 순서를 바꾸고, ‘완료’로 연필을 뗍니다. 카탈로그만 바뀝니다.', 'listLabel': '편집 대기(순서대로)', 'count': {'one': '편집 대기 {count}개', 'other': '편집 대기 {count}개'}, 'keys': '끌어서 순서 변경 · 행에서 Alt+↑ ↓로 이동', 'empty': '편집할 것이 없습니다', 'howTo': '앨범이나 프로젝트 표지의 연필(또는 ⋯ 메뉴의 ‘편집 대기로 표시’)을 누르면 여기에 추가됩니다. 먼저 할 일을 맨 위에 두세요.', 'rowLabel': '{total}개 중 {n}번째: {type} {name}', 'toTop': '맨 위로', 'up': '위로', 'down': '아래로', 'toBottom': '맨 아래로', 'done': '완료', 'doneTitle': '완료: 연필을 뗍니다(이 목록에서 빠짐)', 'dragTitle': '끌어서 순서 바꾸기', 'moved': '{name}: 이제 {n}번째', 'due': '마감 {date}', 'dueLate': '{date}부터 지연', 'added': '‘{name}’을(를) 편집 대기 {n}번째에 넣었습니다.', 'see': '목록 보기', 'removed': '‘{name}’을(를) 편집 대기에서 뺐습니다.', 'undo': '실행 취소', 'pinTitle': '편집 대기로 표시(연필)', 'pinOnTitle': '편집 대기 — 목록의 {n}번째. 누르면 연필을 뗍니다', 'menuOn': '편집 대기로 표시', 'menuOff': '편집 대기에서 빼기'}})

_merge(MESSAGES, {'brand': {'title': '이름과 로고', 'lead': '제목 표시줄과 시작 화면에 자신의 이름과 로고(기관, 스튜디오, 강좌 등)를 표시합니다. 이 컴퓨터에 저장됩니다.', 'preview': '제목 표시줄 미리 보기', 'name': '이름', 'logo': '로고', 'logoPreview': '로고', 'logoPick': '이미지 선택…', 'logoDefault': 'LionPhotos 로고 사용', 'logoHint': 'PNG, JPG, WebP 또는 SVG. 정사각형 안에 전체가 들어가고 주변은 투명해집니다.', 'poweredNote': '자신의 이름을 쓰면 제목 표시줄과 창 제목에 “Powered by LionPhotos”가 함께 표시됩니다. ‘정보’에는 LionPhotos의 크레딧이 그대로 남습니다.', 'defaultNote': '이름을 비워 두면(또는 LionPhotos) LionPhotos가 유지됩니다. 로고만 바꿀 수도 있습니다.', 'save': '저장', 'reset': 'LionPhotos로 되돌리기', 'change': '변경…', 'saved': '이제 “{name}”(으)로 표시됩니다.', 'restored': 'LionPhotos의 이름과 로고로 돌아왔습니다.', 'badFile': '이 파일은 로고로 쓸 수 있는 이미지가 아닙니다(PNG, JPG, WebP, GIF 또는 SVG, 최대 15MB).'}})

_merge(MESSAGES, {'update': {'dialog': {'howSetup': '새 버전의 설치 프로그램(약 150MB, 앱 전체)을 내려받아 확인합니다. 그런 다음 LionPhotos가 닫히고 설치 프로그램이 새 버전을 설치한 뒤 다시 엽니다. 설정과 카탈로그는 유지됩니다.'}}})

_merge(MESSAGES, {'similar': {'link': '비슷한 사진', 'linkTitle': '이 날의 비슷한 사진을 묶고 각 연속 촬영에서 가장 좋은 사진을 남깁니다', 'menu': '이 날의 비슷한 사진', 'title': '비슷한 사진 · {day}', 'levelLabel': '비슷한 정도', 'prevDay': '이전 날', 'nextDay': '다음 날', 'level': {'same': '거의 같음', 'sameTitle': '거의 똑같은 사진만', 'similar': '비슷함', 'similarTitle': '같은 사진의 변형(권장)', 'scene': '같은 장면', 'sceneTitle': '같은 순간을 다른 각도에서 찍은 사진까지'}, 'reading': '이 날의 사진을 비교하는 중…', 'progress': '썸네일 {total}개 중 {done}개', 'photos': {'one': '사진 {count}장', 'other': '사진 {count}장'}, 'groups': {'one': '그룹 {count}개', 'other': '그룹 {count}개'}, 'noThumb': {'one': '{count}장은 아직 썸네일 없음', 'other': '{count}장은 아직 썸네일 없음'}, 'send': {'one': '{count}장을 보류함으로 보내기', 'other': '{count}장을 보류함으로 보내기'}, 'sendNone': '보낼 사진 없음', 'footNote': '남김 {keep} · 보류함으로 {go}', 'withTwins': {'one': '(같은 사진의 RAW 또는 JPG +{count})', 'other': '(같은 사진의 RAW 또는 JPG +{count})'}, 'none': '이 날에는 비슷한 사진이 없습니다', 'noneTry': '‘같은 장면’으로 바꾸면 같은 순간을 다른 각도에서 찍은 사진도 묶습니다.', 'noneScene': '이 날의 사진은 모두 서로 충분히 다릅니다.', 'tryScene': '‘같은 장면’ 시도', 'lead': '각 그룹에는 사실상 같은 사진이 모여 있습니다. 남길 것으로 제안된 사진은 테두리로 표시되고, 나머지는 보류함으로 보낼 예정입니다. 사진을 클릭하면 남기기/보내기가 바뀌고, 두 번 클릭하면 비교합니다.', 'groupLabel': '그룹 {n}, 사진 {count}장', 'group': '그룹 {n}', 'keeps': {'one': '{count}장 남김', 'other': '{count}장 남김'}, 'compareTitle': '이 사진들을 나란히 비교', 'compare': '비교', 'keepAll': '모두 남기기', 'keepBest': '제안된 사진만 남기기', 'tileOut': '보류함으로 감', 'tileKeep': '남김', 'tileHint': '클릭하여 바꾸기, 두 번 클릭하여 비교', 'bestTitle': '제안: 가장 선명하고 노출이 좋은 사진(또는 표시한 사진)', 'best': '베스트', 'confirmTitle': {'one': '비슷한 사진 {count}장을 보류함으로 보낼까요?', 'other': '비슷한 사진 {count}장을 보류함으로 보낼까요?'}, 'confirmMessage': '사진에서 빠져 보류함에서 기다리며, 다시 되돌릴 수 있습니다. 파일은 삭제되지 않습니다.', 'sent': {'one': '비슷한 사진 {count}장을 보류함으로 보냈습니다.', 'other': '비슷한 사진 {count}장을 보류함으로 보냈습니다.'}, 'undo': '실행 취소'}, 'limbo': {'twins': {'one': '같은 사진의 RAW 또는 JPG도 보내기({count}개 파일)', 'other': '같은 사진의 RAW 또는 JPG도 보내기({count}개 파일)'}}})

_merge(MESSAGES, {'statusbar': {'slowSource': '이 폴더는 읽기가 느립니다(Google 드라이브 같은 클라우드 드라이브?). 썸네일을 만드는 동안 다음 파일을 미리 가져옵니다. 드라이브 앱에서 폴더를 ‘오프라인 사용 가능’으로 표시하면 훨씬 빨라집니다.'}})

_merge(MESSAGES, {'gs': {'group': {'content': '사진에 담긴 것'}, 'content': {'analyse': '사진에 담긴 것으로 검색', 'analyseSub': '이 컴퓨터에서 사진을 한 장씩 백그라운드로 읽습니다(진행 상황은 앨범 › 추천에 표시)', 'started': '사진을 읽는 중입니다. 읽은 사진부터 담긴 것으로 검색할 수 있습니다.', 'unsupported': '사진에 담긴 것을 읽으려면 그래픽 카드(WebGL)가 필요하지만 여기서는 사용할 수 없습니다.'}}, 'content': {'shows': '담긴 것', 'searchTitle': '사진에서 “{name}” 검색'}})

_merge(MESSAGES, {'source': {'local': '이 컴퓨터의 디스크', 'external': '외장 디스크(USB, 메모리 카드)', 'cloud': '클라우드 드라이브', 'cloudNamed': '클라우드: {service}', 'network': '네트워크', 'externalShort': '외장', 'networkShort': '네트워크', 'cloudShort': '클라우드'}})

_merge(MESSAGES, {'brand': {'pluginNote': '켜져 있는 플러그인 “{plugin}”이 앱의 이름과 로고를 정합니다. 여기 칸이 비어 있는 동안 그것이 쓰이며, 직접 입력하면 그쪽이 우선합니다.', 'usePlugin': '플러그인 것 사용'}, 'plugins': {'givesBrand': '켜져 있는 동안 앱 이름을 “{name}”(으)로, 로고도 바꿉니다.', 'givesLogo': '켜져 있는 동안 앱 로고를 바꿉니다.'}})

_merge(MESSAGES, {'dupes': {'compare': '나란히 비교', 'compareTitle': '남길 사본을 왼쪽에, 다른 사본을 오른쪽에 두고 같은지 확인합니다', 'compareExternal': '컴퓨터의 프로그램에서 각각 창으로 열어 나란히 놓습니다', 'open': 'LionPhotos에서 열기', 'keeping': '이 사본을 남깁니다', 'keepThis': '이 사본 남기기(나머지는 휴지통으로)'}})

_merge(MESSAGES, {'similar': {'titleShown': '표시된 사진 중 비슷한 사진', 'shownTitle': '표시된 사진(이 폴더, 연도 또는 앨범, 필터 포함) 중 사실상 같은 사진을 묶어 남길 것을 고릅니다', 'fewShown': '비슷한 사진을 찾으려면 사진을 두 장 이상 표시하세요.', 'more': {'other': '더 보기({count}개 그룹 남음)'}}})

_merge(MESSAGES, {'similar': {'button': '비슷한 사진', 'more': {'one': '더 보기({count}개 그룹 남음)', 'other': '더 보기({count}개 그룹 남음)'}}})

_merge(MESSAGES, {'sidebar': {'forget': '이 목록에서 빼기(앨범과 표시는 그대로 남음)', 'forgotten': '{folder}을(를) 이전에 연 폴더 목록에서 뺐습니다. 카탈로그는 남아 있어 다시 열면 모두 그대로입니다.', 'forgetUndone': '{folder}이(가) 목록에 다시 돌아왔습니다.'}})

_merge(MESSAGES, {'compare': {'onLeft': '왼쪽', 'onRight': '오른쪽', 'strip': '비교 중인 사진', 'stripHint': '클릭하면 표시된 쪽에 보여 줍니다', 'count': {'one': '사진 {count}장', 'other': '사진 {count}장 중 2장씩'}}})

_merge(MESSAGES, {'similar': {'count': {'one': '사진 {count}장', 'other': '사진 {count}장'}, 'countTitle': '이 그룹의 사진 수', 'notOne': '같은 그룹 아님', 'notOneTitle': '이 사진들은 같은 그룹이 아닙니다(구도는 비슷하지만 다른 사람이 찍힌 경우 등). 다시 함께 묶이지 않습니다', 'photoMenu': '이 사진에 대한 추가 작업', 'setBest': '베스트로 선택', 'keepOnly': {'one': '이것만 남기기: 다른 1장은 보류함으로', 'other': '이것만 남기기: 다른 {count}장은 보류함으로'}, 'takeOut': '그룹에서 빼기', 'compareThis': '나란히 비교', 'takenOut': '{name}을(를) 그룹에서 뺐습니다. 이 사진들과 다시 묶이지 않습니다.', 'notOneDone': {'one': '이 사진은 더 이상 그룹에 없습니다.', 'other': '이 사진 {count}장은 더 이상 그룹이 아니며 다시 함께 묶이지 않습니다.'}}})

_merge(MESSAGES, {'similar': {'whoUnknownTitle': '이 사진에서 아직 사람을 찾지 않았습니다. 지금 찾는 중입니다', 'whoUnknown': '사람 찾는 중…', 'whoNone': '사람 없음', 'faceNamed': '{name} — 클릭하여 변경', 'faceName': {'person': '이 사람은 누구인가요?', 'pet': '어떤 반려동물인가요?'}, 'eyebrowPerson': '인물', 'eyebrowPet': '반려동물', 'faceLabel': '이름', 'faceSave': '저장', 'faceSaved': '{name} 저장됨: 이 얼굴은 이제 인물에 있습니다.', 'stack': '비슷한 사진 묶기', 'stackTitle': '비슷한 사진 그룹을 가장 좋은 사진 한 장으로 보여 주고 장수를 표시합니다(숫자를 클릭하면 그룹이 열림)', 'stackReading': '묶기 위해 사진을 읽는 중', 'stackOpen': {'one': '비슷한 사진 {count}장 그룹', 'other': '비슷한 사진 {count}장 그룹'}, 'stackBadge': {'one': '비슷한 사진 {count}장: 그룹 열기', 'other': '비슷한 사진 {count}장: 그룹 열기'}}, 'compare': {'more': '이 사진에 대한 추가 작업', 'keepTitle': '남기거나 보류함으로 보내기(스페이스 바)', 'stays': '남김', 'goes': '보류함으로', 'hintKeep': '스페이스: 남김/보냄 · ← → 그룹의 다른 사진 · Tab으로 쪽 바꾸기 · 휠로 둘 다 확대'}, 'carry': {'labels': '앨범과 인물', 'mark': '표시', 'stays': '남김', 'field': '항목', 'inKept': '남는 사진', 'inGoing': '보내는 사진', 'empty': '비어 있음', 'from': '{name}에서', 'apply': '가져오고 계속', 'skip': '가져오지 않고 계속', 'title': {'one': '보내는 사진에 남는 사진에 없는 정보가 {count}개 있습니다', 'other': '보내는 사진에 남는 사진에 없는 정보가 {count}개 있습니다'}, 'message': '남는 사진으로 가져올 항목을 선택하세요(카탈로그에 기록되며 되돌릴 수 있음). 더 완전하거나 더 최근인 항목이 미리 선택되어 있습니다.'}})

_merge(MESSAGES, {'similar': {'statusReading': '묶기 위해 사진을 읽는 중: {total}장 중 {done}장', 'statusFaces': '얼굴 찾는 중: {total}장 중 {done}장 — 다른 사람이 있는 그룹은 나뉩니다', 'statusPaused': '일시 중지됨', 'statusDone': '{groups} · {photos}장 중 {grouped}장이 그룹에 있습니다(각 그룹은 가장 좋은 사진을 표시)', 'statusGroups': {'one': '비슷한 사진 그룹 {count}개', 'other': '비슷한 사진 그룹 {count}개'}, 'statusNone': '표시된 사진 {photos}장 중 비슷한 사진이 없습니다'}})

_merge(MESSAGES, {'similar': {'statusFromCatalog': {'one': '사진 {count}장의 얼굴은 카탈로그에서(이미 분석됨)', 'other': '사진 {count}장의 얼굴은 카탈로그에서(이미 분석됨)'}}})

_merge(MESSAGES, {'similar': {'only': '묶인 사진만', 'onlyTitle': '비슷한 사진 그룹만 보여 줍니다(각 그룹은 가장 좋은 사진으로). 혼자인 사진은 빠집니다'}})

_merge(MESSAGES, {'photos': {'kind': {'grouped': '묶인 사진'}}})

_merge(MESSAGES, {'viewer': {'stackLabel': {'one': '비슷한 사진 {count}장', 'other': '비슷한 사진 {count}장'}, 'stackOpen': '남길 사진 고르기', 'stackOpenTitle': '그룹을 열어 남길 사진과 보류함으로 보낼 사진을 고릅니다'}})

_merge(MESSAGES, {'similar': {'why': {'menu': '왜 묶였나요(묶이지 않았나요)?', 'title': '이 사진들이 묶인(묶이지 않은) 이유', 'reading': '사진을 읽는 중…', 'picture': '이미지', 'unread': '읽지 않음(아직 썸네일 없음)', 'alike': '{pct} 비슷함({level} 기준은 {need})', 'time': '시간', 'apart': '{span} 차이(최대 {max})', 'people': '인물', 'others': '사진마다 다른 사람이 있음', 'notSeen': '아직 분석되지 않음', 'same': '같은 사람(또는 사람 없음)', 'decision': '내 결정', 'said': '같은 그룹이 아니라고 지정함', 'together': '같은 그룹에 있습니다.', 'firstPhoto': '서로는 충분히 비슷하지만, 들어갈 그룹이 덜 비슷한 사진으로 시작되었습니다(각 사진은 그룹의 첫 사진과도 비슷해야 합니다).', 'wouldAt': '{levels} 수준에서 함께 묶입니다.', 'never': '어떤 수준에서도 함께 묶이지 않습니다.', 'useLevel': '{level} 수준으로 묶기', 'unsay': '같은 그룹입니다', 'stillReading': '사진을 아직 읽는 중입니다. 그룹은 바뀔 수 있습니다.', 'lead': '찍은 순서대로 각 사진과 다음 사진을, 지금 수준({level})에서 본 내용과 함께 보여 줍니다.', 'seconds': '{n}초', 'minutes': '{m}분 {s}초', 'hours': '{h}시간 {m}분'}}})

_merge(MESSAGES, {'similar': {'why': {'minutesOnly': '{m}분', 'days': {'one': '{count}일', 'other': '{count}일'}}}})

_merge(MESSAGES, {'photos': {'rawsInGroup': {'one': '이 그룹의 RAW 파일 {count}개', 'other': '이 그룹의 RAW 파일 {count}개'}}})

_merge(MESSAGES, {'similar': {'sens': {'label': '묶기 위해 필요한 비슷한 정도', 'title': '"비슷함" 쪽일수록 더 많이 묶이고, "거의 같음" 쪽일수록 거의 같은 사진만 묶입니다', 'value': '{pct}% 비슷함, 최대 {min}분 차이', 'same': '거의 같음', 'alike': '비슷함'}, 'why': {'alikeSens': '{pct} 비슷함(현재 감도의 기준은 {need})', 'wouldFrom': '감도를 {v} 이상으로 하면 함께 묶입니다.', 'useSens': '감도 {v} 사용', 'leadSens': '찍은 순서대로 각 사진과 다음 사진을, 지금 감도(100 중 {v})에서 본 내용과 함께 보여 줍니다.'}, 'removeFromGroup': '사진을 그룹에서 빼기', 'removedFromGroup': '{name}을(를) 그룹에서 뺐습니다. 이 사진들과 다시 묶이지 않습니다.'}})

_merge(MESSAGES, {'similar': {'makeSingle': '단독으로 만들기'}})

_merge(MESSAGES, {'labels': {'type': {'person': {'find': '인물 찾기 또는 추가'}, 'pet': {'find': '반려동물 찾기 또는 추가'}, 'place': {'find': '장소 찾기 또는 추가'}, 'album': {'find': '앨범 찾기 또는 추가'}}, 'findOrNew': 'Enter: "{name}" 만들기', 'findNone': '"{name}" 없음 — Enter로 만들기'}})

_merge(MESSAGES, {'similar': {'why': {'content': '내용', 'contentUnread': '아직 내용 모델이 읽지 않음', 'contentAlike': '보여 주는 내용이 {pct} 비슷함(내용 모델)'}}})

_merge(MESSAGES, {'similar': {'mode': {'label': '비슷한 사진 표시 방법', 'all': '모두', 'stacks': '묶음', 'groups': '그룹만', 'allTitle': '모든 사진을 한 장씩', 'stacksTitle': '비슷한 사진 그룹을 가장 좋은 사진 한 장으로, 묶음과 장수와 함께', 'groupsTitle': '비슷한 사진 그룹만(혼자인 사진은 빠짐)', 'groupsOff': '혼자인 사진도 보기'}}})

_merge(MESSAGES, {'similar': {'pickAll': '모두 선택', 'pickNoneBtn': '선택 해제', 'pickedOf': '그룹 {total}개 중 {n}개 선택됨', 'pickTitle': '선택됨: 여기서 하는 작업이 적용됩니다', 'inPicked': '선택한 그룹에서:', 'pickNone': '그룹을 선택하세요'}})

_merge(MESSAGES, {'adjust': {'group': {'curves': '곡선'}}, 'curves': {'canvasLabel': '곡선: 각 밝기가 어떻게 바뀌는지', 'channel': '채널', 'resetChannel': '이 곡선을 직선으로', 'hint': '곡선을 클릭해 점을 추가하고 끌어 옮깁니다. 점을 밖으로 끌거나 두 번 클릭하면 지워집니다. 화살표 키로 고른 점을 옮깁니다.', 'point': '입력 {x} → 출력 {y}', 'mixed': '선택한 사진들의 곡선이 다릅니다. 여기서 맞춘 값이 모두에 적용됩니다.', 'ch': {'rgb': 'RGB', 'r': '빨강', 'g': '초록', 'b': '파랑', 'rgbTitle': '이미지 전체(밝기)', 'rTitle': '이미지의 빨강', 'gTitle': '이미지의 초록', 'bTitle': '이미지의 파랑'}}})

_merge(MESSAGES, {'similar': {'groupSwitch': '사진 묶기', 'menuTitle': '민감도, 그룹만, 비슷한 사진 검토, 묶인(묶이지 않은) 이유', 'review': '비슷한 사진 검토…', 'sens': {'heading': '민감도'}, 'why': {'pick': '2~12장의 사진을 선택하면 묶인(묶이지 않은) 이유를 볼 수 있습니다.'}}})

_merge(MESSAGES, {'similar': {'groupSwitch': '사진 스택', 'stackTitle': '비슷한 사진의 각 스택을 한 장(가장 좋은 사진)으로, 몇 장인지와 함께 보여줍니다(숫자를 클릭하면 스택이 열립니다)', 'menuTitle': '민감도, 스택만, 비슷한 사진 검토, 스택된(되지 않은) 이유', 'mode': {'groups': '스택만', 'groupsTitle': '비슷한 사진의 스택만(혼자인 사진은 제외)'}, 'statusReading': '스택하기 위해 사진을 읽는 중: {total}장 중 {done}장', 'statusFaces': '얼굴을 찾는 중: {total}장 중 {done}장 — 다른 사람이 있는 스택은 나뉩니다', 'statusDone': '{groups} · {photos}장 중 {grouped}장이 스택에 있습니다(각 스택은 가장 좋은 사진을 보여줌)', 'statusGroups': {'one': '비슷한 사진 스택 {count}개', 'other': '비슷한 사진 스택 {count}개'}, 'stackBadge': {'one': '비슷한 사진 {count}장: 스택 열기', 'other': '비슷한 사진 {count}장: 스택 열기'}, 'stackOpen': {'one': '비슷한 사진 {count}장의 스택', 'other': '비슷한 사진 {count}장의 스택'}, 'why': {'menu': '왜 스택되었나요(되지 않았나요)?', 'title': '이 사진들은 왜 스택되었나요(되지 않았나요)?', 'pick': '2~12장의 사진을 선택하면 스택된(되지 않은) 이유를 볼 수 있습니다.', 'together': '같은 스택에 있습니다.', 'said': '같은 스택이 아니라고 지정했습니다', 'unsay': '같은 스택입니다', 'stillReading': '사진을 아직 읽는 중입니다: 스택이 바뀔 수 있습니다.'}, 'sens': {'label': '스택하려면 사진이 얼마나 비슷해야 하는지', 'title': '"비슷함" 쪽일수록 더 많이 스택되고, "거의 같음" 쪽은 거의 같은 사진만'}, 'stackSel': '사진 스택', 'stackSelTitle': '선택한 사진을 비슷하지 않아도 하나의 스택으로 묶습니다', 'stackFew': '스택하려면 사진을 2장 이상 선택하세요.', 'unstack': '스택 해제', 'unstackTitle': '이 사진들의 스택을 해제합니다: 다시 한 장씩 보입니다', 'stacked': {'one': '사진 {count}장을 스택했습니다.', 'other': '사진 {count}장을 스택했습니다.'}, 'unstacked': {'one': '스택을 해제했습니다.', 'other': '스택 {count}개를 해제했습니다.'}, 'removeFromStack': '스택에서 사진 빼기', 'removedFromStack': '{name}이(가) 스택에서 빠졌으며 이 사진들과 다시 스택되지 않습니다.'}, 'viewer': {'stackOpenTitle': '스택을 열어 남길 사진과 Limbo로 보낼 사진을 고릅니다'}, 'photos': {'rawsInGroup': {'one': '이 스택의 RAW 파일 {count}개', 'other': '이 스택의 RAW 파일 {count}개'}}, 'keys': {'stack': '선택 항목 스택 · 해제'}})

_merge(MESSAGES, {'similar': {'keepBestTitle': '각 그룹에서 추천된 사진을 남기고 나머지는 바로 Limbo로 보냅니다(알림에서 실행 취소 가능)'}})

_merge(MESSAGES, {'photos': {'pairFiles': {'one': '같은 사진의 파일 {count}개(한 장으로 표시):', 'other': '같은 사진의 파일 {count}개(한 장으로 표시):'}}})

_merge(MESSAGES, {'similar': {'pairBadge': {'one': '같은 사진의 파일 {count}개(RAW+JPG): 나란히 보기', 'other': '같은 사진의 파일 {count}개(RAW+JPG): 나란히 보기'}}})

_merge(MESSAGES, {'similar': {'setCover': '커버로 사용', 'setCoverTitle': '이 파일을 사진에서 보이는 사진으로 사용(RAW + JPEG의 커버)', 'coverTitle': '커버: 사진에 보이는 파일', 'pairBadge': {'one': '같은 사진의 파일 {count}개(RAW+JPG): 열기', 'other': '같은 사진의 파일 {count}개(RAW+JPG): 열기'}}, 'viewer': {'pairLabel': {'one': '같은 사진의 파일 {count}개', 'other': '같은 사진의 파일 {count}개'}}})

_merge(MESSAGES, {'similar': {'setBest': '최고로 지정', 'setCover': '최고로 지정', 'setCoverTitle': '이 파일을 사진에서 보이는 사진으로 사용(RAW + JPEG의 최고)', 'coverTitle': '최고: 사진에 보이는 파일'}})

_merge(MESSAGES, {'photos': {'stacksCount': {'one': '스택 {count}개', 'other': '스택 {count}개'}, 'singlesCount': {'one': '단독 사진 {count}장', 'other': '단독 사진 {count}장'}}})

_merge(MESSAGES, {'photos': {'uniqueTotal': '고유한 사진의 예상 합계: {count}', 'uniqueTotalTitle': '비슷한 사진 스택 하나를 한 장으로, 단독 사진도 한 장으로 셉니다(RAW + JPEG는 한 장)'}})

_merge(MESSAGES, {'photos': {'uniqueCount': {'one': '고유 사진 {count}장(예상 합계)', 'other': '고유 사진 {count}장(예상 합계)'}}})

_merge(MESSAGES, {'keys': {'stackNav': '스택의 사진(아래 띠): 이전 · 다음'}})

_merge(MESSAGES, {'keys': {'stackNav': '스택의 사진(아래 띠): ↑ 다음 · ↓ 이전 · B 최고로 지정'}, 'similar': {'bestSet': '“{name}”이(가) 이제 스택의 최고입니다.'}})

_merge(MESSAGES, {'main': {'xmp': {'noCollection': '먼저 컬렉션을 여세요.', 'on': {'title': '메타데이터를 .xmp 파일과 동기화할까요?', 'message': '이제부터 LionPhotos에서 작성한 내용(제목, 설명, 음성 해설, 작성자, 장소, 키워드, 지침, 별점으로서의 표시)은 각 사진 옆의 .xmp 파일에 기록되고, Lightroom, digiKam, darktable이 거기에 기록한 내용은 LionPhotos로 돌아옵니다. 사진 자체는 절대 변경되지 않습니다.', 'read': {'one': '사진 {count}장에 이미 .xmp 파일이 있습니다: 그 내용을 읽습니다', 'other': '사진 {count}장에 이미 .xmp 파일이 있습니다: 그 내용을 읽습니다'}, 'readDetail': 'LionPhotos가 아는 항목만 변경하고, 나머지(현상 설정, 다른 프로그램의 태그)는 그대로 둡니다. 각 원본은 LionPhotos 데이터 폴더에 보관됩니다.', 'write': {'one': '사진 {count}장에 카탈로그 내용으로 새 .xmp 파일을 만듭니다', 'other': '사진 {count}장에 카탈로그 내용으로 새 .xmp 파일을 만듭니다'}, 'writeDetail': '카탈로그에 아무것도 없는 사진에는 파일을 만들지 않습니다.', 'confirm': '동기화', 'note': '여기와 다른 프로그램에서 모두 변경된 항목은 덮어쓰지 않습니다: 남길 값을 직접 선택합니다. 백업 페이지에서 끌 수 있습니다.'}}}, 'ops': {'xmpOn': {'done': '이제 메타데이터가 .xmp 파일과 동기화됩니다.', 'read': {'one': '.xmp에서 사진 {count}장을 읽었습니다.', 'other': '.xmp에서 사진 {count}장을 읽었습니다.'}, 'written': {'one': '.xmp 파일 {count}개를 기록했습니다.', 'other': '.xmp 파일 {count}개를 기록했습니다.'}}}, 'xmp': {'title': '.xmp 파일의 메타데이터', 'lead': '설명, 장소, 키워드, 표시(별점)를 각 사진 옆의 .xmp 파일에 보관하고 Lightroom, digiKam, darktable과 동기화합니다: 한쪽이 쓴 것을 다른 쪽이 읽습니다.', 'switch': '동기화', 'switchTitle': '켜짐: 변경할 때마다 .xmp 파일이 자동으로 기록됩니다', 'off': '카탈로그에만 보관.', 'checking': '.xmp 파일과 비교 중…', 'error': '.xmp 파일과 비교할 수 없습니다: {error}', 'upToDate': '동기화됨(마지막 비교 {when}).', 'waiting': '다음 변경 후 비교합니다.', 'readCount': {'one': '.xmp에서 사진 {count}장 업데이트', 'other': '.xmp에서 사진 {count}장 업데이트'}, 'writtenCount': {'one': '.xmp {count}개 기록', 'other': '.xmp {count}개 기록'}, 'resolveCount': {'one': '충돌 {count}건 해결', 'other': '충돌 {count}건 해결'}, 'checkNow': '지금 비교', 'noConflicts': '충돌 없음: 카탈로그와 .xmp 파일이 일치합니다.', 'inCatalog': 'LionPhotos', 'inFile': '.xmp 파일', 'conflictsTitle': {'one': '여기와 다른 프로그램에서 변경된 사진 {count}장', 'other': '여기와 다른 프로그램에서 변경된 사진 {count}장'}, 'conflictsMessage': '이 항목들은 마지막으로 일치한 이후 LionPhotos와 .xmp 파일 양쪽에서 변경되었습니다. 남길 값을 선택하세요: 양쪽에 모두 반영됩니다.', 'allCatalog': '모두 LionPhotos에서', 'allFile': '모두 파일에서', 'apply': '적용', 'resolved': {'one': '사진 {count}장이 이제 .xmp와 일치합니다.', 'other': '사진 {count}장이 이제 .xmp와 일치합니다.'}, 'conflictsToast': {'one': '사진 {count}장이 여기와 다른 프로그램에서 변경되었습니다: 남길 값을 선택하세요.', 'other': '사진 {count}장이 여기와 다른 프로그램에서 변경되었습니다: 남길 값을 선택하세요.'}, 'resolve': '해결'}})

_merge(MESSAGES, {'photos': {'view': '보기', 'viewTitle': '사진 표시 방식: 격자 또는 목록, 크기, 순서', 'noAlbumOnly': '앨범에 없는 사진만'}, 'selbar': {'mark': '표시', 'album': '앨범', 'compare': '비교', 'export': '내보내기…', 'limbo': '림보'}, 'actions': {'files': '파일', 'moveByDate': '날짜 폴더로 이동…', 'moveByDateTitle': '선택한 사진으로 정리를 엽니다'}, 'compare': {'needTwo': '사진이 2장 이상 필요합니다'}, 'similar': {'stackSel': '선택한 사진 쌓기'}, 'organize': {'scope': {'none': '선택한 사진 없음'}, 'pickFirst': '이 도구를 쓰려면 사진에서 사진을 선택하세요.', 'pickFirstShort': '먼저 사진 선택', 'goPhotos': '사진으로 이동', 'leadSafe': '여기서 시작하세요: LionPhotos가 이벤트마다 폴더를 제안하고, 무엇이든 옮기기 전에 모두 검토합니다. 아래 도구는 선택한 사진이나 체크한 앨범에만 적용됩니다.', 'wholeCollection': '컬렉션 전체', 'toolsTitle': '폴더 도구', 'toolsLead': '날짜 폴더와 이동은 사진에서 선택한 사진에, 앨범 폴더는 체크한 앨범에 적용됩니다. 컬렉션 전체에는 다시 정리를 사용하세요.'}, 'mix': {'eyebrow': {'one': '날짜 폴더 · 파일 {count}개', 'other': '날짜 폴더 · 파일 {count}개'}, 'title': {'one': '이벤트 폴더 {count}개를 날짜 폴더에 섞습니다', 'other': '이벤트 폴더 {count}개를 날짜 폴더에 섞습니다'}, 'message': '이벤트 폴더는 비게 되고, 같은 기간의 다른 이벤트 사진이 한 폴더에 들어갑니다.', 'reorganize': '컬렉션 다시 정리(권장)', 'reorganizeDetail': '이벤트마다 폴더를 유지하고 이름에 날짜를 붙입니다. 먼저 모두 검토합니다.', 'anyway': '그래도 날짜 폴더에 섞기', 'anywayDetail': '다음에 입력 코드를 묻습니다. 최근 작업에서 되돌릴 수 있습니다.'}})
