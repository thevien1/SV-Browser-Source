// User-facing documentation for the desktop app. Keep limitations alongside controls.
const CONSOLE_CHECK = `(async () => {
  const gl = document.createElement('canvas').getContext('webgl');
  const info = gl?.getExtension('WEBGL_debug_renderer_info');
  const devices = await navigator.mediaDevices.enumerateDevices();

  console.table({
    CPU: navigator.hardwareConcurrency,
    'RAM (GB)': navigator.deviceMemory,
    'WebGL Vendor': info ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL) : 'Không có',
    'WebGL Renderer': info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'Không có',
    Camera: devices.filter(d => d.kind === 'videoinput').length,
    Micro: devices.filter(d => d.kind === 'audioinput').length,
    'Audio output': devices.filter(d => d.kind === 'audiooutput').length
  });
})();`;
const SOFTWARE_CHECK = `(async () => {
  let rtc;
  try {
    const pc = new RTCPeerConnection();
    pc.close();
    rtc = 'Tạo được PeerConnection; chưa kết luận về IP';
  } catch (error) {
    rtc = 'Không tạo được PeerConnection: ' + error.name;
  }
  console.table({
    'User agent': navigator.userAgent,
    Platform: navigator.platform,
    Language: navigator.language,
    Languages: navigator.languages.join(', '),
    Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    Screen: screen.width + ' x ' + screen.height,
    Available: screen.availWidth + ' x ' + screen.availHeight,
    Viewport: innerWidth + ' x ' + innerHeight,
    Window: outerWidth + ' x ' + outerHeight,
    'Device pixel ratio': devicePixelRatio,
    'CSS device-width khớp Screen': matchMedia('(device-width: ' + screen.width + 'px)').matches,
    WebRTC: rtc
  });
  if (navigator.userAgentData) {
    console.table(await navigator.userAgentData.getHighEntropyValues([
      'architecture', 'bitness', 'platformVersion'
    ]));
  }
})();`;

// Item: title, purpose and steps, example/result, optional support limitation.
const GUIDE_SECTIONS = [
 {id:'start',title:'1. Bắt đầu và bố cục phần mềm',intro:'Một profile là một hồ sơ trình duyệt có thư mục dữ liệu riêng. Trước khi dùng, kiểm tra bản quyền, engine phù hợp hệ điều hành và nơi lưu dữ liệu.',items:[
  ['Thanh điều hướng','Profiles là danh sách hồ sơ; Nhóm & Tags để phân loại; Extensions để quản lý tiện ích; Thùng rác để khôi phục. Các mục còn lại gồm Automation, Tài liệu, Cài đặt, Lịch sử profile, Giới thiệu và Trình quản lý cập nhật.','Ví dụ: vào Profiles → Thêm mới để tạo hồ sơ đầu tiên.'],
  ['Thanh tiêu đề và làm mới','Biểu tượng tải xuống mở cập nhật; biểu tượng sáng/tối đổi giao diện; nút mũi tên vòng làm mới ứng dụng/dữ liệu. Danh sách profile còn có cơ chế làm mới nền định kỳ.','Nếu đang nhập biểu mẫu, lưu thay đổi trước khi tải lại ứng dụng.'],
  ['Sẵn sàng và đang mở','Sẵn sàng nghĩa là hồ sơ chưa chạy. Đang mở nghĩa là ứng dụng đang theo dõi một phiên trình duyệt. Lỗi proxy hoặc khởi chạy sẽ có thông báo riêng.','Không xem trạng thái Sẵn sàng là bằng chứng proxy đang Live.'],
  ['Dữ liệu và engine','Dữ liệu profile gồm lịch sử, cookie, phiên đăng nhập và cache tùy trình duyệt. Engine là bộ chạy Chrome/Chromium, Firefox, Brave, Edge hoặc Mullvad được nhận diện/cài riêng.','Sao lưu trước khi chuyển máy. Core Windows và macOS không dùng thay nhau.']
 ]},
 {id:'create-profile',title:'2. Tạo mới profile — thông tin chung và Thao tác nhanh',intro:'Vào Profiles → Thêm mới. Điền tên/nhóm, chọn engine, kiểm tra các tab rồi bấm Thêm mới. Khung bên phải tóm tắt lựa chọn đang nhập.',api:'profiles-create',items:[
  ['Tên profile và Nhóm','Tên giúp nhận ra tài khoản/công việc; nhóm gom các hồ sơ liên quan. Chọn nhóm hiện có hoặc dùng Default group.','Ví dụ: tên “Khách hàng A 001”, nhóm “Dự án A”.'],
  ['Tạo thông số ngẫu nhiên','Nút này chọn ngẫu nhiên một số giá trị CPU, RAM và độ phân giải trong danh sách. Kiểm tra lại tóm tắt trước khi lưu.','Ví dụ: CPU 4, RAM 8 GB, Screen 1366x768. Không có nghĩa mọi thông số đều được tạo mới hoặc chống phát hiện tuyệt đối.'],
  ['Trình duyệt và phiên bản','Chọn loại và phiên bản engine có trên máy. Nếu chưa có core, vào Trình quản lý cập nhật để tải bản dành cho hệ điều hành/kiến trúc máy hiện tại.','Chrome/Chromium, Brave, Edge dùng luồng Chromium; Firefox/Mullvad có phạm vi hỗ trợ khác.'],
  ['Taskbar title','Trường nhãn tiêu đề được lưu vào cấu hình hồ sơ, giúp đặt thông tin mong muốn cho phiên trình duyệt.','Có thể đặt “Tài khoản A”.','Bản hiện tại chưa có luồng áp dụng trường này đầy đủ để bảo đảm đổi tiêu đề/taskbar trên mọi engine.'],
  ['URL khởi động','Nhập website muốn truy cập khi mở profile. URL riêng của profile được ưu tiên hơn URL mặc định trong Cài đặt → Trình duyệt. Nếu cả hai trống, Chromium mở Tab mới.','Ví dụ: https://example.com. Không còn giữ about:blank làm trang cuối sau bước khởi tạo.'],
  ['Ghi chú profile','Lưu thông tin công việc; ghi chú xuất hiện ở cột Ghi chú và có thể sửa nhanh hoặc cập nhật qua API Notes.','Ví dụ: “Đã kiểm tra proxy; chờ xử lý ngày tiếp theo”. Không đặt mật khẩu trong ghi chú.'],
  ['Proxy ở Thao tác nhanh','Chọn None nếu kết nối trực tiếp, hoặc chọn loại proxy rồi nhập địa chỉ/thông tin tương ứng. Tab Kết nối cho phép tách Host, Port, User và Password.','Ví dụ định dạng: host:port:user:password; thay bằng proxy của bạn.'],
  ['Static file / bỏ qua tài nguyên tĩnh','Trường này dành cho cấu hình tài nguyên tĩnh trong hồ sơ. Dữ liệu nhập được lưu cùng profile.','Không dùng trường này như bằng chứng việc chặn ảnh/video đã được bật.','Bản hiện tại chưa có xử lý chặn tài nguyên tương ứng trong luồng mở Chromium.'],
  ['Khung tóm tắt và lưu','Kiểm tra Browser, OS, User agent, Proxy, Language, Timezone, WebRTC, Screen và Hardware ở cột phải; bấm Thêm mới sau khi kiểm tra.','Tạo xong chưa đồng nghĩa trình duyệt đã mở. Tìm hồ sơ trong danh sách rồi bấm Mở.']
 ]},
 {id:'connection',title:'3. Tạo/sửa profile — tab Kết nối và proxy',intro:'Chọn đúng loại kết nối của nhà cung cấp. Định dạng địa chỉ đúng không thay thế cho việc kiểm tra tài khoản/cổng và kết nối thực tế.',items:[
  ['None — không dùng proxy','Trình duyệt đi qua kết nối mạng hiện tại của máy. Chọn None sẽ không dùng chuỗi proxy đang lưu trong ô địa chỉ.','IP website thấy thường là IP đầu ra của mạng/VPN đang dùng trên máy.'],
  ['HTTP','Nhập Host, Port và tài khoản nếu proxy yêu cầu xác thực. HTTP proxy có thể tạo đường hầm CONNECT để truy cập website HTTPS.','Host proxy.example, Port 8080; User/Password theo nhà cung cấp.'],
  ['HTTPS — TLS tới proxy','Dùng khi chính máy chủ proxy yêu cầu kết nối TLS. Loại này khác với HTTP proxy có hỗ trợ truy cập website HTTPS.','Chỉ chọn HTTPS khi nhà cung cấp ghi rõ proxy dùng TLS; chứng chỉ máy chủ phải hợp lệ.'],
  ['SOCKS4','Chọn SOCKS4 cho server SOCKS4; trường User là User ID nếu cần. Không dùng mật khẩu SOCKS5 để cấu hình SOCKS4.','SOCKS4 không có cơ chế username/password giống SOCKS5.'],
  ['SOCKS5','Nhập địa chỉ SOCKS5; điền User/Password nếu có. Luồng Chromium sử dụng cầu nối proxy local để hỗ trợ xác thực.','Dùng đúng loại SOCKS5, không đổi sang HTTP chỉ vì cổng giống nhau. DNS upstream SOCKS5 được xử lý qua proxy.'],
  ['TMProxy','Nhập API key hoặc URL API của TMProxy theo nhãn trên form. Ứng dụng đọc proxy hiện tại từ phản hồi của nhà cung cấp trước khi kết nối.','Key hết hạn hoặc phản hồi lỗi sẽ được báo lỗi; không coi là proxy Live.'],
  ['Tinsoft','Nhập key hoặc URL API lấy proxy Tinsoft. Ứng dụng dùng địa chỉ proxy trả về để chạy và kiểm tra kết nối.','Cần API còn hiệu lực và phản hồi có địa chỉ proxy hợp lệ.'],
  ['Host, Port, User, Password','Tab Kết nối tách các thành phần để tránh nhập nhầm. Các ô đồng bộ với chuỗi proxy ở Thao tác nhanh; mật khẩu có ký tự đặc biệt được mã hóa khi tạo URL.','Host không kèm khoảng trắng; Port nằm trong 1–65535.'],
  ['URL xoay IP / lấy IP mới','Nhập URL HTTPS gọi API xoay/lấy proxy khi cần. Khi kiểm tra hoặc mở, ứng dụng gọi API và dùng địa chỉ trả về nếu phản hồi có proxy mới.','Không nhầm URL xoay với địa chỉ host:port. Lệnh xoay thực sự có thể đổi IP của dịch vụ.'],
  ['Kiểm tra kết nối Proxy','Bấm kiểm tra, đợi kết quả IP/quốc gia hoặc thông báo lỗi. HTTP/HTTPS/SOCKS được kiểm tra bằng yêu cầu qua proxy, không chỉ thử mở cổng.','Nếu báo thất bại: kiểm tra loại, mật khẩu, trạng thái key, whitelist IP và kết nối nhà cung cấp.'],
  ['Chọn từ thư viện proxy','Liên kết này xuất hiện trong form để nhắc định dạng nhập proxy.','Có thể nhập trực tiếp proxy vào form.','Bản hiện tại chưa có hộp chọn thư viện proxy thực sự tại liên kết này.']
 ]},
 {id:'hardware',title:'4. Tạo/sửa profile — từng tính năng Hardware',intro:'Các cấu hình sau áp dụng cho Chromium ở trang/iframe bằng CDP và JavaScript. Không thay thế toàn bộ fingerprint native trong worker hoặc mọi API nội bộ. Firefox/Mullvad giữ mặc định riêng tư và chưa hỗ trợ bộ Hardware này.',items:[
  ['Canvas: Noise / Off / Block','Noise thêm nhiễu xác định theo profile khi đọc dữ liệu canvas; Off giữ hành vi gốc; Block chặn các đường đọc canvas được triển khai.','Ví dụ: so sánh cùng một phép vẽ giữa Noise và Off sau khi mở lại profile. Nhiễu cố định theo profile, không nhất thiết đổi khi tải lại.'],
  ['Client rect: Noise / Off','Noise thêm độ lệch rất nhỏ vào kết quả đo hình chữ nhật của phần tử/Range; Off giữ kết quả gốc.','Không phải chế độ thay đổi bố cục CSS. Kiểm tra bằng cùng một phần tử và phép đo getBoundingClientRect.'],
  ['WebGL Image: Noise / Off','Noise tác động dữ liệu readPixels và ảnh canvas WebGL xuất bằng toDataURL/toBlob; Off giữ các đường đọc này ở hành vi gốc, độc lập với Canvas 2D Noise/Block.','Trên CreepJS, images là hash ảnh xuất còn pixels là hash dữ liệu readPixels. Off vẫn hiển thị hình và GPU; muốn đổi tên GPU dùng WebGL Metadata. Phạm vi chưa bao phủ mọi API OffscreenCanvas/worker.'],
  ['WebGL Metadata: Masked / Off / Custom','Masked trả tên vendor/renderer chung ở API được hỗ trợ; Off trả thông tin Chromium thực; Custom dùng Vendor và Renderer bạn nhập.','Custom phải có cả hai trường. Ví dụ Vendor “Fixture Vendor”, Renderer “Fixture Renderer” để kiểm tra.'],
  ['Audio: Noise / Off','Noise thêm thay đổi nhỏ vào các buffer/đường phân tích âm thanh được triển khai; Off giữ dữ liệu gốc.','Không phải thay loa hoặc làm thay đổi mọi âm thanh nghe được. So sánh đầu ra cùng một phép thử Audio.'],
  ['Font: Masked / Off / System','Masked giới hạn một số API kiểm tra/liệt kê font và quyền local-fonts; Off/System giữ hành vi gốc theo lựa chọn được lưu.','Không cài bộ font mới và không bảo đảm ẩn toàn bộ font hệ điều hành.'],
  ['CPU Cores','Chọn số nhân được báo cho trang web qua navigator.hardwareConcurrency và cơ chế CDP tương ứng.','Chọn 8 Cores → Console cần báo CPU: 8. Không cấp thêm 8 nhân vật lý cho máy.'],
  ['Dung lượng RAM','Chọn giá trị RAM được báo ở navigator.deviceMemory trong phạm vi JavaScript áp dụng.','Chọn 8 GB → Console cần báo RAM (GB): 8. Không phải giới hạn hoặc cấp phát RAM của tiến trình trình duyệt.'],
  ['Video inputs','-1 (Auto) giữ danh sách thiết bị do trình duyệt trả về; 0 hoặc số cụ thể mô phỏng số camera trong enumerateDevices.','0 → danh sách camera mô phỏng có 0 thiết bị.','Không tạo camera vật lý; quyền website và API native khác vẫn có giới hạn riêng.'],
  ['Audio inputs / outputs','-1 giữ danh sách thực do trình duyệt cung cấp; số cụ thể áp dụng số đầu vào và đầu ra âm thanh trong danh sách mô phỏng.','Chọn 2 → enumerateDevices có thể trả 2 audioinput và 2 audiooutput theo cấu hình. Không tạo micro hoặc loa thật.']
 ]},
 {id:'software',title:'5. Tạo/sửa profile — từng tính năng Software',intro:'Lựa chọn riêng của profile được giữ khi sửa. Bấm Cập nhật rồi đóng/mở lại profile đang chạy để áp dụng; lưu form không thay cấu hình của tiến trình cũ ngay lập tức.',items:[
  ['Hệ điều hành OS','Chọn Windows, Mac Intel, Mac ARM, Linux hoặc Android để định hướng thông tin OS/UA được báo cho website.','Chọn Android không biến Chromium desktop thành máy Android thật; Mac/Windows ở đây không thay hệ điều hành vật lý.'],
  ['User agent Auto','Auto dùng UA của engine đang chạy; khi chọn OS khác, ứng dụng điều chỉnh token OS tương ứng trên Chromium.','Phiên bản engine lấy từ trình duyệt, không phải chuỗi UA cố định cho mọi core.'],
  ['User agent tùy chỉnh','Thay Auto bằng chuỗi UA bạn muốn dùng. Chuỗi được ưu tiên thay cho UA tự động của profile.','Sau khi mở lại: kiểm tra navigator.userAgent và header User-Agent của request. Không nhập xuống dòng.'],
  ['Language','Chọn ngôn ngữ cụ thể để báo locale/ngôn ngữ và header tương ứng. Real giữ ngôn ngữ gốc; Auto/Base on IP dùng dữ liệu địa lý phát hiện được khi mở.','Ví dụ: vi-VN,vi. Nếu bỏ kiểm tra IP qua API, không mặc định có dữ liệu IP để suy ra ngôn ngữ.'],
  ['Timezone','Chọn múi giờ IANA cụ thể hoặc Auto theo IP. Auto cần xác định được múi giờ từ dữ liệu mạng.','Ví dụ: Asia/Bangkok. Nếu Auto báo không xác định được, chọn múi giờ rõ ràng hoặc kiểm tra lại kết nối/IP.'],
  ['WebRTC BaseOnIp / Real / Disable','Chromium: BaseOnIp hạn chế UDP ngoài proxy nhưng vẫn cho tạo kết nối; Real giữ mặc định engine; Disable chặn RTCPeerConnection ở trang/iframe. Firefox/Mullvad: Disable ghi media.peerconnection.enabled=false; Real xóa override của ứng dụng để trả về mặc định engine.','BaseOnIp không hỗ trợ trên Firefox/Mullvad. Real trên Mullvad có thể vẫn tắt WebRTC do mặc định của engine. Không coi BaseOnIp là thay IP thành IP proxy; Noise chưa hỗ trợ.'],
  ['Kiểm tra WebRTC bằng about:config','Chỉ trên Firefox/Mullvad: gõ about:config vào thanh địa chỉ; tự bấm Accept the Risk and Continue nếu được hỏi; tìm media.peerconnection.enabled. false là tắt; true là cho phép theo engine.','Muốn tắt thủ công có thể nhấp đúp true thành false. Để ứng dụng quản lý lâu dài, chọn Disable trong Software rồi đóng/mở lại profile. Chrome/Chromium không có about:config; dùng mã Software ở mục kiểm tra Console để thử tạo PeerConnection.'],
  ['Geolocation Prompt / Block / Allow','Prompt để website hỏi quyền; Block từ chối; Allow cấp quyền và áp dụng tọa độ phát hiện từ IP.','Allow cần dữ liệu vị trí. Đây là vị trí báo cho website, không bật GPS vật lý trên máy.'],
  ['Screen','-1x-1 giữ Screen và tỷ lệ điểm ảnh gốc của engine; giá trị cụ thể áp dụng Screen theo pixel CSS mà website đọc, không đổi độ phân giải vật lý của Windows/macOS. Nội dung trang vẫn theo cửa sổ thật.','Bật Cài đặt → Trình duyệt → Giới hạn kích thước để đặt kích thước cửa sổ khi mở profile. Sau đó có thể tự kéo kích thước hoặc phóng toàn màn hình. Nếu tắt giới hạn, cửa sổ có thể lớn hơn Screen giả lập. Đối chiếu screen.width/height, innerWidth/height, outerWidth/height và devicePixelRatio bằng mã Software.'],
  ['Firefox và Mullvad','Chọn engine tương ứng khi đã cài bản phù hợp. Một số tùy chọn có thể bị khóa vì chưa được hỗ trợ trong luồng này.','Bộ Hardware, cookie khởi động và CDP của Chromium không được áp dụng tương đương trên Firefox/Mullvad.']
 ]},
 {id:'cookies',title:'6. Cookies — nhập, nạp khi khởi động và xuất',intro:'Cookie có thể chứa phiên đăng nhập. Chỉ nhập dữ liệu bạn có quyền sử dụng và giữ bản sao an toàn trước khi thay đổi.',items:[
  ['Cookies khởi động trong form','Mở tab Cookies, dán JSON hoặc Netscape rồi tạo/cập nhật profile. Trên Chromium, cookie hợp lệ được nạp trước URL khởi động.','Ví dụ JSON: [{"name":"sid","value":"gia-tri-mau","domain":".example.com","path":"/"}].'],
  ['JSON cookie','Danh sách cần name/value và domain hoặc url; có thể có path, secure, httpOnly, expirationDate/expires, sameSite.','SameSite=None cần secure=true; thời gian hết hạn tính bằng giây, không phải mili giây.'],
  ['Netscape cookie','Dữ liệu cần 7 cột phân cách bằng Tab, gồm domain, includeSubdomains, path, secure, expires, name, value. Hỗ trợ dòng #HttpOnly_.','Ví dụ hình thức: .example.com<TAB>TRUE<TAB>/<TAB>FALSE<TAB>0<TAB>sid<TAB>gia-tri-mau.'],
  ['Import cookie từ menu profile','Mở menu dấu ba chấm → Import cookie → chọn file. Với profile Chromium đang chạy, ứng dụng thử nạp vào phiên rồi lưu dữ liệu hồ sơ.','Cookie không hợp lệ được báo lỗi. Firefox/Mullvad chưa hỗ trợ cookie khởi động qua luồng này.'],
  ['Export cookies','Chọn profile → Export → Export cookies → chọn nơi lưu. Kiểm tra thông báo và file đầu ra.','Đây là thao tác lấy dữ liệu ra file, khác với tab Cookies dùng để nhập. Không chia sẻ file cookie chứa phiên đăng nhập.']
 ]},
 {id:'console-check',title:'7. Kiểm tra cấu hình bằng DevTools Console',intro:'Thực hiện trong chính cửa sổ trình duyệt của profile cần kiểm tra. Đóng/mở lại profile sau mỗi lần sửa cấu hình. Đoạn mã dưới chỉ đọc CPU/RAM/WebGL/danh sách thiết bị; không gửi dữ liệu lên server.',items:[
  ['Bước 1 — mở Console','Trong trình duyệt profile nhấn F12, chọn tab Console. Trên Mac có thể dùng tổ hợp phím mở Developer Tools của trình duyệt.','Không chạy trong cửa sổ Console của một profile khác.'],
  ['Bước 2 — gõ allow pasting','Nếu DevTools chặn dán và hiện cảnh báo, tự gõ allow pasting rồi nhấn Enter. Gõ đúng hai từ, không có dấu nháy. Sau đó mới dán đoạn mã bên dưới và nhấn Enter.','allow pasting','Chỉ cho phép dán mã bạn đã đọc và hiểu; đây là bảo vệ riêng của DevTools, không phải lỗi SV Browser.'],
  ['Bước 3 — đối chiếu bảng kết quả','CPU 8 Cores và RAM 8 GB cần cho kết quả CPU: 8, RAM (GB): 8. WebGL Metadata Off hiển thị thông tin GPU do Chromium trả về; Masked hiển thị giá trị chung; Custom hiển thị chuỗi đã nhập.','Video/Audio -1 giữ danh sách trình duyệt; số đếm còn phụ thuộc quyền và ngữ cảnh website.'],
  ['Bước 4 — kiểm tra Noise riêng','Đoạn mã dưới không chứng minh Canvas/Audio/Client rect Noise đã hoạt động. Muốn kiểm tra, dùng cùng phép vẽ/âm thanh/phần tử rồi so sánh Noise với Off trên cùng profile, mở lại sau mỗi lần đổi.','Nhiễu dùng seed cố định theo profile nên tải lại trang không nhất thiết cho hash khác.'],
  ['Nếu Console báo lỗi thiết bị','Một số trang không có navigator.mediaDevices hoặc WebGL; thử website HTTPS bình thường. Firefox/Mullvad khi tắt WebRTC native cũng có thể không cung cấp mediaDevices; khi đó dùng mã Software để kiểm tra RTC/Screen thay vì mã đọc danh sách thiết bị.','Các trang nội bộ, quyền bị chặn hoặc engine không hỗ trợ có thể cho kết quả khác; không tự suy ra có camera/micro vật lý chỉ từ danh sách mô phỏng.']
 ]},
 {id:'batch-create',title:'8. Tạo hàng loạt, import và export profile',intro:'Các thao tác này làm việc với nhiều hồ sơ hoặc dữ liệu trên đĩa. Xem kỹ số lượng, tên và nơi lưu trước khi xác nhận.',items:[
  ['Tạo hàng loạt','Bấm Tạo hàng loạt; nhập số lượng, tiền tố tên, nhóm, tags, trình duyệt/phiên bản và danh sách proxy mỗi dòng; bấm Thêm mới.','Ví dụ: 10 hồ sơ, tiền tố “Dự án A”, tags “US,VIP”. Kiểm tra hồ sơ tạo ra trước khi mở tất cả.'],
  ['Nhóm và Tags khi tạo hàng loạt','Chọn nhóm đã có hoặc nhập nhóm mới theo form; tags được nhập cách nhau bằng dấu phẩy.','Đây là phân loại dữ liệu, không tự phân chia tài khoản đăng nhập hay tạo tài khoản website.'],
  ['Import profiles','Bấm Import, chọn kiểu thư mục hoặc ZIP, nguồn dữ liệu và nhóm đích nếu có; thực hiện và đọc số profile nhập được.','Chỉ chọn gói hồ sơ phù hợp. Dữ liệu Windows có thể cần engine/đường dẫn khác trên Mac.'],
  ['Export profiles','Tick các profile → Export → Export profiles; chọn thư mục đích, các tùy chọn trong hộp thoại rồi xuất.','Đọc đường dẫn file đầu ra trong thông báo. Nên đóng trình duyệt trước khi sao lưu để dữ liệu trên đĩa nhất quán.'],
  ['Bảo vệ bản sao','Gói profile có thể chứa cookie, lịch sử và thông tin tài khoản. Kiểm tra nơi lưu và giới hạn người được đọc.','Không gửi gói sao lưu cho người khác chỉ để hỏi lỗi giao diện.']
 ]},
 {id:'profiles-list',title:'9. Danh sách Profiles — tìm kiếm, lọc, chọn và mở/đóng',intro:'Thanh lọc thay đổi danh sách hiển thị; thanh thao tác hàng loạt làm việc với các profile đã được chọn.',api:'profiles-list',items:[
  ['Tìm kiếm và bộ lọc','Nhập tên/proxy, chọn nhóm, tag hoặc trạng thái proxy để thu hẹp danh sách. Xóa giá trị lọc để xem lại toàn bộ.','Ví dụ: nhóm Dự án A + tag US. Bộ lọc không tự kiểm tra lại IP.'],
  ['Sắp xếp','Chọn tên tăng/giảm, ngày tạo mới/cũ hoặc thứ tự tùy chỉnh. Ở chế độ tùy chỉnh, dùng tay kéo để đổi vị trí theo khả năng của bảng.','Không nhầm thứ tự bảng với thứ tự file trong thư mục dữ liệu.'],
  ['Chọn profile và phân trang','Tick từng dòng hoặc checkbox đầu bảng; kiểm tra số profile đang chọn. Chọn số bản ghi mỗi trang và dùng nút chuyển trang.','Bỏ chọn bằng dấu ×. Kiểm tra lại tập được chọn trước thao tác xóa hoặc sửa hàng loạt.'],
  ['Mở và Đóng','Bấm Mở ở từng dòng hoặc chọn nhiều dòng rồi bấm Mở/Đóng trên thanh công cụ. Chờ trạng thái/thông báo hoàn tất.','Mở có thể dừng vì proxy lỗi, thiếu engine hoặc cấu hình không hợp lệ. Đóng không xóa profile.'],
  ['Ghi chú và Tags ngay trong bảng','Bấm biểu tượng sửa ở cột Ghi chú hoặc Tags để cập nhật thông tin quản lý mà không cần mở lại toàn bộ form.','Ví dụ: đổi ghi chú thành “Đã xử lý”; thêm tag “done”.'],
  ['Thao tác với profile đang mở','Nút lọc/thao tác với profile đang mở giúp tập trung vào các phiên hiện chạy; chọn tác vụ phù hợp và xem số lượng.','Không dùng lưu cấu hình như cách thay đổi nóng Hardware/Software của cửa sổ đang mở.']
 ]},
 {id:'bulk-edit',title:'10. Thanh hàng loạt — Sửa và Sao chép',intro:'Chọn profile trước, mở menu Sửa hoặc Sao chép và kiểm tra đúng tập hồ sơ. Thay đổi cấu hình có hiệu lực trong phiên mở tiếp theo.',api:'profiles-update',items:[
  ['Thay đổi nhóm','Chọn các profile → Sửa → Thay đổi nhóm → chọn nhóm đích và lưu.','Ví dụ: chuyển 5 hồ sơ từ Default group sang Dự án A.'],
  ['Gán / Sửa tags','Mở hộp sửa tags để phân loại tập profile đã chọn; kiểm tra danh sách thẻ trước khi xác nhận.','Nếu tác vụ thay danh sách thẻ, giữ lại các thẻ cũ vẫn cần dùng.'],
  ['Đổi tên hàng loạt','Sửa → Đổi tên; nhập quy tắc/tên theo hộp thoại, xem tập được chọn rồi áp dụng.','Tên là nhãn quản lý; ID profile vẫn là định danh dùng cho API.'],
  ['Cập nhật proxy hàng loạt','Sửa → Cập nhật proxy; nhập danh sách theo hướng dẫn của hộp thoại và xác nhận.','Kiểm tra tương ứng số dòng proxy/số profile và loại kết nối; test lại sau khi lưu.'],
  ['Cập nhật phiên bản trình duyệt','Sửa → Cập nhật phiên bản trình duyệt; chọn core có sẵn, lưu rồi mở lại hồ sơ.','Không chuyển dữ liệu quan trọng sang phiên bản cũ hơn mà chưa sao lưu.'],
  ['Thay đổi URL khởi động','Sửa → Thay đổi URL khởi động để cập nhật trang mở đầu cho tập profile.','Nhập URL đầy đủ. Xóa URL riêng có thể làm profile dùng URL mặc định trong Cài đặt.'],
  ['Thay đổi fingerprint','Nút này tạo lại đối tượng fingerprint được lưu theo luồng hiện tại.','Kiểm tra Hardware/Software riêng trong form nếu muốn đổi các giá trị cụ thể.','Không xem thao tác này là thay toàn bộ fingerprint native; lớp Hardware runtime hiện dùng cấu hình riêng và seed theo ID profile.'],
  ['Nhân bản profile','Sao chép → Nhân bản profile mở hộp thoại từ hồ sơ nguồn; nhập số lượng và proxy theo form rồi tạo.','Nếu chọn nhiều profile, thao tác hiện tại dùng profile đầu làm nguồn. Kiểm tra dữ liệu/phiên đăng nhập trong bản nhân.'],
  ['Copy Proxy và Copy ID Profile','Sao chép → Copy Proxy lấy chuỗi proxy; Copy ID Profile lấy ID dùng cho API/automation.','ID khác tên profile. Nội dung proxy có thể kèm thông tin xác thực.']
 ]},
 {id:'tools',title:'11. Công cụ — từng chức năng và trạng thái hỗ trợ',intro:'Chọn hồ sơ trong bảng trước khi mở menu Công cụ. Trạng thái xử lý hiển thị theo từng profile; tác vụ dọn dẹp xử lý tuần tự theo tập hiển thị.',items:[
  ['Kiểm tra proxy','Chọn profile → Công cụ → Kiểm tra proxy. Đợi từng dòng cập nhật Live/lỗi và IP/quốc gia nếu lấy được.','Proxy Live tại thời điểm kiểm tra không đảm bảo website đích cho phép đăng nhập.'],
  ['Giải phóng dung lượng','Đóng profile → Công cụ → Giải phóng dung lượng → đọc xác nhận rồi chạy. Tác vụ dọn các thư mục cache/tệp tạm được xác định.','Profile đang chạy được bỏ qua/từ chối; kết quả cho biết số byte giải phóng. Không cam kết giảm 50% hay một tỷ lệ cố định.'],
  ['Xóa cache','Dùng tác vụ Xóa cache khi chỉ cần dọn bộ nhớ đệm của các profile đã chọn. Đóng profile trước, kiểm tra kết quả từng dòng.','Khác với xóa hồ sơ. Mục tiêu là cache, không phải chủ động xóa cookie/mật khẩu.'],
  ['Đồng bộ thao tác','Mục này đang xuất hiện trong menu Công cụ.','Không dùng nó như tính năng đã có thể nhân bản thao tác từ một cửa sổ sang nhiều cửa sổ.','Chưa triển khai: trong phiên bản hiện tại nút chưa được nối xử lý đồng bộ thao tác.'],
  ['Sắp xếp cửa sổ trình duyệt','Mục này đang xuất hiện trong menu Công cụ.','Khi mở qua API có thể dùng window_pos/window_size cho từng phiên.','Chưa triển khai: nút menu chưa được nối xử lý sắp xếp cửa sổ tự động.']
 ]},
 {id:'row-menu',title:'12. Menu dấu ba chấm của từng profile',intro:'Menu từng dòng làm việc với đúng profile tại dòng đó. Không nhầm với tập profile đang tick ở thanh hàng loạt.',items:[
  ['Kiểm tra proxy, Ghi chú, Gán/Sửa Tags','Dùng các mục tương ứng để kiểm tra kết nối hoặc chỉnh thông tin phân loại của một hồ sơ.','Sửa ghi chú/tags không mở website.'],
  ['Sửa profile','Bấm Sửa → đổi các tab mong muốn → Cập nhật. Mở lại form để xác nhận giá trị đã lưu.','Nếu cửa sổ trình duyệt đang chạy, đóng/mở lại để dùng cấu hình mới. Lỗi lưu phải được xử lý, không bỏ qua.'],
  ['Nhân bản và Thay đổi màu sắc','Nhân bản tạo hồ sơ từ nguồn theo hộp thoại; Thay đổi màu sắc gán màu quản lý cho hồ sơ.','Màu là nhãn trực quan, không phải màu GPU hay Canvas Noise.'],
  ['Import cookie và Mở thư mục profile','Import cookie đọc file cookie; Mở thư mục đưa bạn đến thư mục dữ liệu của hồ sơ trên đĩa.','Không sửa/xóa file dữ liệu khi profile đang chạy.'],
  ['Giải phóng dung lượng','Chạy dọn cache/tệp tạm cho một hồ sơ đã đóng; đọc xác nhận và kết quả.','Không phải xóa vĩnh viễn hồ sơ.'],
  ['Mở ẩn danh (Incognito)','Mở phiên riêng tư theo khả năng engine.','Không thay thế proxy và không ẩn IP với website chỉ nhờ chế độ ẩn danh.'],
  ['Chạy với remote port','Nhập cổng điều khiển để công cụ automation kết nối tới phiên này. Cổng bận hoặc không hợp lệ bị từ chối.','Để ứng dụng tự cấp cổng nếu không cần số cố định. Mullvad không cung cấp Chromium CDP.'],
  ['Copy ID, chuyển đầu/cuối danh sách','Copy ID để dùng trong API. Chuyển đầu/cuối để thay vị trí quản lý theo thứ tự tùy chỉnh.','Dùng sắp xếp Tùy chỉnh để thấy đúng vị trí vừa thay đổi.'],
  ['Xóa profile','Chọn chuyển vào thùng rác hoặc xóa vĩnh viễn theo hộp thoại. Kiểm tra tên/ID trước khi đồng ý.','Xóa vĩnh viễn không có thao tác khôi phục bình thường. Muốn có thể phục hồi, chọn thùng rác.']
 ]},
 {id:'groups-tags',title:'13. Nhóm & Tags',intro:'Nhóm tổ chức hồ sơ theo một nhóm chính; tags cho phép gắn nhiều nhãn theo mục đích sử dụng.',items:[
  ['Nhóm — thêm, sửa, xóa, sao chép tên','Vào Nhóm & Tags → Nhóm; nhập tên để thêm, dùng nút sửa để đổi tên/thứ tự và nút sao chép để lấy tên. Xóa nhóm khi không còn dùng.','Default group được bảo vệ; xóa nhóm thường chuyển hồ sơ về nhóm mặc định, khác với xóa profile.'],
  ['Tags — thêm và xóa','Chuyển sang tab Tags, nhập tên nhãn để tạo; gán vào hồ sơ bằng cột Tags, menu hoặc sửa hàng loạt.','Ví dụ: US, VIP, chờ xử lý. Xóa nhãn có thể ảnh hưởng phân loại; kiểm tra các profile đang dùng nhãn.'],
  ['Lọc lại trong Profiles','Sau khi tạo nhóm/tag, trở về Profiles và chọn bộ lọc tương ứng.','Nếu chưa thấy dữ liệu, làm mới danh sách hoặc xóa bộ lọc cũ.']
 ]},
 {id:'extensions',title:'14. Extensions',intro:'Quản lý tiện ích toàn cục. Chỉ cài tiện ích từ nguồn bạn tin cậy; khả năng hỗ trợ phụ thuộc engine.',api:'extensions-list',items:[
  ['Thêm từ URL/ID, file hoặc thư mục','Bấm thêm extension, chọn nguồn URL/ID theo form, file ZIP/CRX hoặc thư mục unpacked có manifest. Chọn dữ liệu rồi kiểm tra thông báo nhập.','Không phải mọi URL đều là gói extension có thể cài trực tiếp.'],
  ['Bật/tắt tiện ích','Dùng công tắc ở từng tiện ích. Mở lại profile để kiểm tra tiện ích có được nạp ở phiên mới hay không.','Đọc trạng thái quản lý toàn cục không chứng minh tiện ích đã hoạt động trong mọi phiên đang mở.'],
  ['Cập nhật, mở thư mục, xóa','Dùng nút cập nhật để chọn file mới; mở thư mục để xem dữ liệu; xóa để loại tiện ích khỏi kho quản lý.','Sao lưu nếu cần quay lại bản trước. Không đồng nghĩa gỡ ngay khỏi mọi tiến trình đã mở.'],
  ['Tìm kiếm và làm mới','Gõ tên tiện ích trong ô tìm kiếm; dùng nút làm mới khi vừa thay dữ liệu ngoài ứng dụng.','Firefox/Mullvad không có bộ nạp extension giống Chromium trong luồng này.']
 ]},
 {id:'trash',title:'15. Thùng rác',intro:'Lưu các profile đã xóa mềm để có thể khôi phục trước khi xóa vĩnh viễn.',items:[
  ['Tìm kiếm, chọn và làm mới','Vào Thùng rác; tìm theo thông tin hiển thị, tick từng dòng hoặc nhiều dòng và dùng phân trang khi danh sách dài.','Xem đúng số profile được chọn trước khi thao tác.'],
  ['Khôi phục','Chọn hồ sơ → Khôi phục, hoặc dùng nút khôi phục ở dòng. Sau đó trở về Profiles và làm mới.','Khôi phục chỉ thành công nếu dữ liệu cần thiết còn trên đĩa.'],
  ['Xóa vĩnh viễn','Chọn đúng hồ sơ rồi dùng xóa vĩnh viễn và đọc xác nhận.','Thao tác này xóa dữ liệu khỏi thùng rác; cần bản sao lưu riêng nếu muốn phục hồi sau đó.']
 ]},
 {id:'automation',title:'16. Automation',intro:'Mục Automation giúp nhận diện và mở SV Browser Automate Editor. Việc xây dựng/chạy kịch bản được thực hiện trong công cụ editor tương ứng.',api:'profiles-start',items:[
  ['Phát hiện và mở Editor','Vào Automation. Nếu nhận diện được editor đã cài, ứng dụng thử mở công cụ; nếu chưa có, dùng hướng dẫn cài/chọn đường dẫn trong màn hình.','Quét lại sau khi cài xong hoặc đổi thư mục.'],
  ['Đổi đường dẫn và quét lại','Chọn đường dẫn đến editor đúng máy, sau đó bấm Quét lại/Kiểm tra lại.','Không chọn file DMG macOS làm chương trình chạy trên Windows hoặc ngược lại.'],
  ['Tạo tab bằng CDP trên macOS','Ứng dụng cấu hình tab trước rồi mới điều hướng đến URL khởi động. Với công cụ bên ngoài, hãy tạo about:blank, đợi cấu hình được áp dụng rồi mới điều hướng.','Một số core Mac chạy mã của URL truyền thẳng vào Target.createTarget trước khi hoàn tất cấu hình. Không bảo đảm cấu hình có hiệu lực ngay từ script đầu tiên trong trường hợp đó.'],
  ['Kết nối profile cho kịch bản','Công cụ automation cần ID profile và thông tin phiên mở từ API. Dùng tài liệu API để lấy đúng endpoint và ví dụ.','Mullvad không có WebSocket CDP như Chromium. Không suy ra mọi engine đều hỗ trợ cùng thao tác automation.']
 ]},
 {id:'settings-general',title:'17. Cài đặt chung',intro:'Đọc nhãn yêu cầu khởi động lại và bấm Lưu khi có thay đổi. Không phải mọi ô cấu hình đang hiển thị đều có luồng áp dụng đầy đủ.',items:[
  ['License và Thay đổi giấy phép','Xem hiệu lực, giới hạn profile/máy; bấm Thay đổi giấy phép để nhập key khác và chờ kiểm tra.','Key bị tạm khóa/thu hồi trên server có thể bị từ chối dù là key vĩnh viễn.'],
  ['Ngôn ngữ/giao diện và GPU','Dùng nút giao diện trên thanh tiêu đề để đổi sáng/tối. Cài đặt chung còn có công tắc GPU được lưu trong thiết lập.','Không dùng công tắc GPU như cấu hình card WebGL của profile.','Luồng áp dụng useGpu cho tiến trình giao diện chưa hoàn thiện trong bản hiện tại.'],
  ['Local storage','Chọn nơi lưu dữ liệu profile, lưu và khởi động lại theo nhãn trên màn hình.','Sao lưu dữ liệu trước. Chọn đường dẫn mới không mặc định có nghĩa toàn bộ hồ sơ cũ đã được di chuyển.'],
  ['Private server URL','Ô này lưu địa chỉ server riêng theo cấu hình.','Chỉ điền endpoint phù hợp với hệ thống của bạn.','Luồng khởi chạy hiện chưa áp dụng trường này như một dịch vụ đồng bộ hồ sơ hoàn chỉnh.'],
  ['Thư mục cài đặt SV Browser','Đường dẫn được nhận diện từ ứng dụng; nút Mở thư mục dùng để tìm vị trí cài đặt trên máy.','Đây không phải thư mục dữ liệu profile trừ khi bạn chủ động chọn như vậy.'],
  ['Server truy vấn IP và ping','Chọn dịch vụ hiển thị trong form và dùng nút kiểm tra ping để kiểm tra phản hồi dịch vụ theo luồng cài đặt.','Kiểm tra IP trong luồng mở còn dùng cơ chế truy vấn địa lý riêng; lựa chọn tại đây chưa thay toàn bộ nguồn tra cứu của launcher.']
 ]},
 {id:'settings-browser',title:'18. Cài đặt → Trình duyệt',intro:'Các chế độ mặc định chủ yếu dùng cho profile mới; cấu hình riêng đã lưu của từng profile được ưu tiên. Không dùng thay đổi mặc định để giả định tất cả profile cũ đã được sửa.',items:[
  ['Xóa Cache tự động','Bật để ứng dụng thử dọn cache khi khởi chạy hồ sơ theo luồng launcher.','Không phải tự xóa toàn bộ dữ liệu/phiên đăng nhập.'],
  ['Giới hạn kích thước theo cài đặt','Bật để cửa sổ Chromium nằm trong Screen cụ thể của profile. Chỉ áp dụng một lần lúc mở profile; sau đó kéo cửa sổ, phóng to/toàn màn hình hoặc mở thêm tab sẽ không bị ép trở lại. Screen -1x-1 không bị ép theo giới hạn giả lập.','Nếu API yêu cầu window_size lớn hơn Screen, kích thước sẽ bị giới hạn khi công tắc bật. Tắt công tắc nếu chủ động muốn cửa sổ lớn hơn Screen giả lập.'],
  ['Khôi phục phiên làm việc trước','Công tắc được lưu trong thiết lập.','Không dùng nó như cam kết khôi phục toàn bộ tab đã mở trước đó.','Luồng launcher hiện chưa nối đầy đủ việc khôi phục phiên cũ.'],
  ['URL khởi động mặc định','Nhập URL hoặc danh sách URL theo ô cài đặt; profile không có URL riêng sẽ dùng giá trị này. Trống cả hai nơi thì mở Tab mới trên Chromium.','Ví dụ: https://example.com. URL riêng của profile thắng mặc định chung.'],
  ['Chrome start parameters','Thêm tham số dòng lệnh Chromium trong ô này và lưu. Luồng hiện tại tách theo khoảng trắng và nhận các phần bắt đầu bằng --.','Ví dụ: --disable-notifications. Tham số phức tạp có khoảng trắng có thể không được phân tích như shell đầy đủ.'],
  ['Bookmarks','Ô nhập hiển thị định dạng name|url và lưu nội dung người dùng nhập.','Ví dụ: Trang mẫu|https://example.com.','Chưa có luồng nạp bookmarks này vào browser profile trong launcher hiện tại.'],
  ['Mặc định Canvas/Client rect/WebGL/Audio/Font','Real ánh xạ về hành vi gốc; Noise/Masked/Block ánh xạ về chế độ tương ứng khi tạo profile mới. Có thể ghi đè trong từng form profile.','Real ở Font có thể hiển thị thành System/Off theo form; không phải cài font mới.'],
  ['Screen Random / Real','Random chọn một độ phân giải ổn định theo ID hồ sơ khi tạo; Real giữ Screen gốc.','Random không có nghĩa đổi độ phân giải mỗi giây hoặc mỗi lần tải lại trang.'],
  ['Language Real / Base on IP','Real giữ ngôn ngữ của engine; Base on IP dùng chế độ tự động theo dữ liệu IP khi mở.','Muốn ngôn ngữ cố định: đặt rõ vi-VN,vi hoặc ngôn ngữ cần dùng trong Software của profile.'],
  ['Khôi phục cài đặt mặc định và Lưu','Khôi phục đưa các lựa chọn cài đặt về giá trị đề xuất; Lưu để ghi thay đổi theo giao diện.','Không xóa hồ sơ, không tự thay mọi giá trị Hardware/Software của profile cũ.']
 ]},
 {id:'api',title:'19. Cài đặt API Gateway và tài liệu API',intro:'API local dùng cho công cụ tự động hóa. Hướng dẫn sử dụng phần mềm ở /purpose; danh sách request/response ở /docs; giải thích từng endpoint ở /api-purpose.',items:[
  ['Local API URL, sao chép, Kiểm thử','Vào Cài đặt → API Gateway để xem cổng. Sao chép URL hoặc dùng Kiểm thử. Nếu đổi cổng, dùng URL mới khi mở tài liệu.','Mặc định http://localhost:8725. Tài liệu trong ứng dụng phải dùng cổng bạn đã chọn.'],
  ['Cho phép remote từ internet','Tùy chọn cho phép server lắng nghe từ kết nối ngoài máy theo cấu hình ứng dụng.','Chỉ bật khi bạn hiểu mạng/firewall và kiểm soát được ai truy cập. Đây không tự tạo một dịch vụ cloud có xác thực đầy đủ.'],
  ['Mở, đọc và dùng ví dụ API','Vào /docs để xem method, path, query/body và phản hồi; thay ID mẫu bằng ID thật. Dùng nút Sao chép URL GET hoặc cURL phù hợp.','Một số GET như start, close, free-disk và update-state thay đổi trạng thái; không xem mọi GET là chỉ đọc.'],
  ['Notes, mở profile và lỗi HTTP','Đọc success/message trước khi dùng data. Notes có endpoint đọc/cập nhật; start trả kết nối theo engine; close kết thúc phiên.','400 thường là tham số sai, 403 bản quyền, 404 ID/route không có, 500 lỗi xử lý. Xem thông báo cụ thể.']
 ]},
 {id:'history',title:'20. Lịch sử profile, Giới thiệu và Tài liệu',intro:'Các mục này cung cấp lịch sử phiên và thông tin hỗ trợ, không thay thế nhật ký truy cập website bên trong từng trình duyệt.',items:[
  ['Lịch sử profile','Vào Lịch sử profile để xem các phiên mở/đóng, tên profile, thời điểm và trạng thái theo bộ lọc/tìm kiếm trên màn hình.','Dữ liệu lưu local; lịch sử mở không phải toàn bộ URL đã truy cập hoặc nội dung automation.'],
  ['Giới thiệu','Xem phiên bản ứng dụng, liên kết trang chủ và tài liệu.','Đối chiếu phiên bản khi báo lỗi; không gửi kèm key bản quyền nguyên văn.'],
  ['Tài liệu → Hướng dẫn chức năng / Purpose','Bấm nút Hướng dẫn chức năng / Purpose để mở trang này. Có mục lục, tìm kiếm và liên kết tới từng chương.','Tạo profile → Hardware → từng lựa chọn; Công cụ → từng chức năng và trạng thái hỗ trợ.'],
  ['Tài liệu chính thức và API local','Tài liệu chính thức mở https://svbrowser.site/docs. API local mở /docs trên cổng của máy bạn; Purpose giải thích thao tác trên giao diện.','Không nhầm trang hướng dẫn sử dụng với danh mục endpoint dành cho lập trình.']
 ]},
 {id:'updates',title:'21. Trình quản lý cập nhật và core trình duyệt',intro:'Ứng dụng và engine Chromium là hai thành phần khác nhau. Cập nhật SV Browser không có nghĩa tất cả core đều được tải lại.',items:[
  ['Kiểm tra cập nhật ứng dụng','Mở Trình quản lý cập nhật → Kiểm tra lại/Làm mới. Xem phiên bản đang cài và kết quả kiểm tra trước khi tải/cài.','Kiểm tra thất bại phải hiện lỗi; không coi lỗi mạng là bằng chứng “đang dùng mới nhất”.'],
  ['Tải core, cài lại/sửa chữa','Chọn bản Chromium cần dùng trong danh sách; bấm Tải & Cài đặt hoặc Cài lại/Sửa chữa. Đợi tải/giải nén xong rồi chọn core khi tạo/sửa profile.','Core nhận theo catalog API và hệ điều hành/kiến trúc; bản macOS không xuất hiện như core Windows và ngược lại.'],
  ['Cập nhật trên Windows/macOS','Windows dùng bộ cài hoặc cơ chế updater phù hợp. Mac Intel cần x64; Mac Apple Silicon cần arm64. Với Mac chưa ký, cập nhật có thể tải DMG để cài thủ công thay vì tự thay app.','Không dùng file .exe cho Mac hoặc DMG cho Windows. Giữ bản sao dữ liệu trước khi cập nhật.'],
  ['Bản quyền và dữ liệu sau cập nhật','Kiểm tra phiên bản sau khi mở lại; engine đã tải được giữ ở vùng lưu trữ riêng theo cơ chế ứng dụng.','Không xóa thư mục dữ liệu để sửa lỗi cập nhật nếu chưa sao lưu.']
 ]},
 {id:'troubleshooting',title:'22. Tình huống thường gặp và cách kiểm tra',intro:'Xử lý theo thông báo cụ thể. Không tắt các giới hạn hoặc xóa dữ liệu hàng loạt chỉ để thử sửa lỗi.',items:[
  ['Lưu cấu hình nhưng trình duyệt chưa đổi','Mở lại form để kiểm tra đã lưu, sau đó đóng rồi mở lại profile. Kiểm tra đúng ID và đúng engine hỗ trợ tùy chọn.','Nếu form báo lỗi, giữ dữ liệu nhập và xử lý lỗi trước; không giả định đã cập nhật thành công.'],
  ['Cannot find default execution context','Trang chưa tạo môi trường JavaScript hoặc đang chuyển tài liệu khi ứng dụng áp dụng cấu hình. Các bản sửa mới chờ context trong thời gian giới hạn.','Cập nhật app, thử lại một profile với website HTTPS đơn giản; lưu phiên bản core và thông báo nếu vẫn lỗi.'],
  ['CDP timeout: Runtime.evaluate','Chromium chưa trả lời lệnh đọc/thực thi JavaScript trong thời gian chờ. Có thể liên quan target đang dừng hoặc engine treo.','Dùng bản có sửa luồng khởi tạo, kiểm tra tài nguyên máy và core; không bỏ qua lỗi rồi xem cấu hình như đã áp dụng.'],
  ['Trang bị lệch hoặc còn about:blank','Ở bản hiện tại, Screen giả lập không ép chiều rộng viewport. URL trống kết thúc bằng Tab mới; about:blank chỉ dùng tạm khi chuẩn bị profile.','Nếu vẫn gặp: xác nhận đã mở đúng bản ứng dụng mới và mở lại profile, ghi lại Screen và kích thước cửa sổ.'],
  ['Proxy lỗi hoặc Auto timezone không có dữ liệu','Kiểm tra loại proxy/tài khoản, key và quyền truy cập. Chọn timezone cụ thể nếu chưa lấy được vị trí IP.','Không dùng skip_proxy_check như cách chứng minh proxy hoạt động; cờ đó chỉ bỏ bước kiểm tra.'],
  ['Không mở được trang hướng dẫn','Đảm bảo SV Browser đang chạy, kiểm tra cổng API trong Cài đặt và dùng đúng localhost:cổng/purpose.','Nếu dùng app cũ chưa có /purpose, cài bản mới rồi khởi động lại. Trang này không hoạt động khi dịch vụ local đã tắt.']
 ]}
];

const escapeHtml = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getAppGuideHtml(){
 const count=GUIDE_SECTIONS.reduce((n,s)=>n+s.items.length,0);
 return `<!doctype html><html lang="vi" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SV Browser · Hướng dẫn toàn bộ chức năng (Purpose)</title>
 <style>
 :root{color-scheme:light;--bg:#f5f7fc;--card:#fff;--text:#17233a;--muted:#52617b;--line:#dce4f1;--accent:#4f46e5;--soft:#eef2ff;--warn:#854d0e;--warnbg:#fffbeb} [data-theme=dark]{color-scheme:dark;--bg:#101827;--card:#182337;--text:#edf2ff;--muted:#b2bfd5;--line:#344258;--accent:#a5b4fc;--soft:#252c50;--warn:#fde68a;--warnbg:#352d1e}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.75 system-ui,-apple-system,Segoe UI,sans-serif}a{color:var(--accent);text-underline-offset:3px}button,input{font:inherit}header{position:sticky;top:0;z-index:10;background:var(--card);border-bottom:1px solid var(--line);padding:14px 28px;display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap}header strong{font-size:18px}nav{display:flex;gap:10px;align-items:center;flex-wrap:wrap}button,.nav-link{border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--text);padding:7px 12px;cursor:pointer;text-decoration:none}button:hover,.nav-link:hover{background:var(--soft)}button:focus-visible,a:focus-visible,input:focus-visible{outline:3px solid var(--accent);outline-offset:3px}.layout{max-width:1510px;margin:0 auto;padding:30px;display:grid;grid-template-columns:270px minmax(0,1fr);gap:30px}aside{position:sticky;top:95px;align-self:start;max-height:calc(100vh - 120px);overflow:auto;padding-right:10px}aside a{display:block;padding:7px 10px;border-radius:7px;color:var(--muted);text-decoration:none;font-size:13px}aside a:hover{background:var(--soft);color:var(--accent)}.eyebrow{text-transform:uppercase;letter-spacing:2px;font-size:11px;color:var(--accent);font-weight:800}h1{font-size:36px;line-height:1.2;letter-spacing:-1px;margin:10px 0 16px}h2{font-size:24px;line-height:1.4;margin:0 0 12px}h3{font-size:17px;margin:0 0 10px}.muted,.intro{color:var(--muted)}.hero{margin-bottom:25px}.hero p{max-width:850px}.search{width:100%;border:1px solid var(--line);background:var(--card);color:var(--text);padding:13px 16px;border-radius:10px;margin-top:10px}.chapter{scroll-margin-top:105px;border-top:1px solid var(--line);padding-top:28px;margin-top:35px}.feature{padding:20px 24px;margin:14px 0;background:var(--card);border:1px solid var(--line);border-radius:12px;scroll-margin-top:105px}.feature p{margin:7px 0}.example{color:var(--muted);border-left:3px solid var(--line);padding-left:12px}.limit{color:var(--warn);background:var(--warnbg);padding:10px 13px;border-radius:8px}.chapter-link{font-size:12px;margin-left:8px}.code-box{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}.code-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);background:var(--soft)}pre{margin:0;padding:20px;overflow:auto;font:13px/1.7 ui-monospace,Consolas,monospace;white-space:pre}.guide-link{margin-top:15px}footer{color:var(--muted);padding:35px 0;border-top:1px solid var(--line);margin-top:35px}#status{display:none;position:fixed;bottom:22px;right:22px;z-index:20;background:var(--card);color:var(--text);border:1px solid var(--accent);padding:12px 18px;border-radius:10px;max-width:420px;box-shadow:0 8px 35px #0002}[hidden]{display:none!important}@media(max-width:850px){.layout{grid-template-columns:1fr;padding:20px;gap:20px}aside{position:static;max-height:230px;border:1px solid var(--line);border-radius:12px;padding:12px}header{position:static;padding:16px 20px}h1{font-size:29px}.feature{padding:17px}.chapter{scroll-margin-top:20px}}@media print{header,aside,.search,button,#status{display:none!important}.layout{display:block;padding:0}body{background:white;color:black}.feature{break-inside:avoid}.chapter[hidden],.feature[hidden]{display:block!important}}
 </style></head><body><header><strong>SV Browser · Hướng dẫn chức năng / Purpose</strong><nav><a class="nav-link" href="/docs">Tài liệu API</a><a class="nav-link" href="/api-purpose">Giải thích từng API</a><a class="nav-link" href="https://svbrowser.site/docs" target="_blank" rel="noopener noreferrer">Tài liệu chính thức ↗</a><button id="theme" type="button">Đổi sáng / tối</button></nav></header><div class="layout"><aside aria-label="Mục lục"><strong>Mục lục · ${GUIDE_SECTIONS.length} chương</strong>${GUIDE_SECTIONS.map(s=>`<a href="#${s.id}">${escapeHtml(s.title)}</a>`).join('')}</aside><main><section class="hero"><span class="eyebrow">Hướng dẫn sử dụng phần mềm</span><h1>Từng chức năng, từ tạo profile đến các công cụ.</h1><p class="muted">${GUIDE_SECTIONS.length} chương · ${count} mục hướng dẫn. Mỗi mục giải thích công dụng, cách thao tác, ví dụ và phạm vi hỗ trợ. Đây là hướng dẫn giao diện SV Browser; danh mục request và URL GET nằm trong <a href="/docs">tài liệu API</a>.</p><p>Bắt đầu: <a href="#create-profile">Tạo profile</a> → <a href="#connection">Kết nối</a> → <a href="#hardware">Hardware</a> → <a href="#software">Software</a> → <a href="#cookies">Cookies</a> → <a href="#console-check">Kiểm tra cấu hình</a>. Xem riêng <a href="#tools">menu Công cụ</a> và <a href="#row-menu">menu từng profile</a>.</p><label for="search"><strong>Tìm chức năng hoặc cách xử lý</strong></label><input id="search" class="search" type="search" placeholder="Ví dụ: Canvas, allow pasting, tạo hàng loạt, xóa cache…"><p id="result-count" class="muted" role="status">Hiển thị ${count} mục hướng dẫn</p><button id="clear-search" type="button">Xóa tìm kiếm</button></section><p id="empty" hidden>Không tìm thấy mục phù hợp. Thử từ khóa ngắn hơn hoặc xóa tìm kiếm.</p>
 ${GUIDE_SECTIONS.map(s=>`<section class="chapter" id="${s.id}" data-title="${escapeHtml(s.title+' '+s.intro)}"><h2>${escapeHtml(s.title)}<a class="chapter-link" href="#${s.id}" aria-label="Liên kết ${escapeHtml(s.title)}">#</a></h2><p class="intro">${escapeHtml(s.intro)}</p>${s.items.map((i,n)=>`<article class="feature" id="${s.id}-${n+1}"><h3>${escapeHtml(i[0])}</h3><p>${escapeHtml(i[1])}</p>${i[2]?`<p class="example">${escapeHtml(i[2])}</p>`:''}${i[3]?`<p class="limit"><strong>Phạm vi hỗ trợ:</strong> ${escapeHtml(i[3])}</p>`:''}</article>`).join('')}${s.id==='console-check'?`<div class="code-box"><div class="code-head"><strong>Gõ allow pasting → Enter → dán đoạn mã này → Enter</strong><button id="copy-check" type="button">Sao chép mã kiểm tra</button></div><pre><code id="console-code">${escapeHtml(CONSOLE_CHECK)}</code></pre></div><div class="code-box" style="margin-top:20px"><div class="code-head"><strong>Mã kiểm tra Software: UA, OS, ngôn ngữ, timezone, WebRTC và Screen</strong><button id="copy-software" type="button">Sao chép mã Software</button></div><pre><code id="software-code">${escapeHtml(SOFTWARE_CHECK)}</code></pre></div>`:''}${s.api?`<p class="guide-link"><a href="/docs#card-${s.api}">API liên quan: xem tham số, URL GET và request mẫu →</a></p>`:''}</section>`).join('')}
 <footer>SV Browser · Hướng dẫn theo tính năng hiện có. Các mục chưa triển khai hoặc có giới hạn được ghi ngay tại mục tương ứng.<br><a href="/docs">Tài liệu API local</a> · <a href="/purpose">Về đầu trang Purpose</a></footer></main></div><div id="status" role="status" aria-live="polite"></div><script>
 const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
 const search=document.getElementById('search');
 function filterGuide(){const query=normalize(search.value.trim());let visible=0;document.querySelectorAll('.chapter').forEach(chapter=>{let count=0;chapter.querySelectorAll('.feature').forEach(feature=>{const match=!query||normalize(chapter.dataset.title+' '+feature.textContent).includes(query);feature.hidden=!match;if(match)count++;});chapter.hidden=count===0;visible+=count;});document.getElementById('result-count').textContent='Hiển thị '+visible+' mục hướng dẫn';document.getElementById('empty').hidden=visible!==0;}
 search.addEventListener('input',filterGuide);document.getElementById('clear-search').onclick=()=>{search.value='';filterGuide();search.focus();};
 function openChapter(){try{const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(target&&(target.classList.contains('chapter')||target.classList.contains('feature'))){if(target.hidden||target.closest('.chapter')?.hidden){search.value='';filterGuide();}target.scrollIntoView({block:'start'});}}catch{}}
 window.addEventListener('hashchange',openChapter);openChapter();
 document.getElementById('theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('sv_guide_theme',theme);}catch{}};try{if(localStorage.getItem('sv_guide_theme')==='dark')document.documentElement.dataset.theme='dark';}catch{}
 let toastTimer;function toast(message){const status=document.getElementById('status');status.textContent=message;status.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>{status.style.display='none';},3000);}
 for(const [button,code] of [['copy-check','console-code'],['copy-software','software-code']])document.getElementById(button).onclick=async()=>{try{await navigator.clipboard.writeText(document.getElementById(code).textContent);toast('Đã sao chép mã. Trong Console, gõ allow pasting nếu được yêu cầu, rồi dán mã.');}catch{toast('Không sao chép được. Bạn có thể chọn trực tiếp đoạn mã và sao chép.');}};
 </script></body></html>`;
}
module.exports={getAppGuideHtml,GUIDE_SECTIONS,CONSOLE_CHECK,SOFTWARE_CHECK};
