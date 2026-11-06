const SUPABASE_URL = 'https://fjumlujyecxeqpgignxm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ddQAQd3o_YwwERvxfLSPWw_JbODCeYb';
const sb = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

const $ = (selector, root=document) => root.querySelector(selector);
const state = {page:'dashboard', user:null, items:[], categories:[], dailyDownloads:[], toastTimer:null};
const pageContent = $('#pageContent');
const pageNames = {dashboard:'Dashboard',games:'Quản lý Game',categories:'Danh mục Game',users:'Người dùng',downloads:'Quản lý lượt tải',featured:'Game nổi bật',banners:'Banner & Giao diện',notifications:'Thông báo',comments:'Bình luận & Đánh giá',stats:'Thống kê',roles:'Phân quyền Admin',settings:'Cài đặt Website',logs:'Nhật ký hoạt động'};

function esc(value=''){
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function dateLabel(value){
  if(!value)return '—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short'}).format(date);
}
function numberLabel(value){return new Intl.NumberFormat('vi-VN').format(Number(value)||0)}
function showToast(text){
  const node=$('#adminToast');node.textContent=text;node.classList.add('show');
  clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>node.classList.remove('show'),3000);
}
function showGate(title,message){
  $('#adminLoading').hidden=true;$('#adminLayout').hidden=true;$('#adminGate').hidden=false;
  $('#gateTitle').textContent=title;$('#gateMessage').textContent=message;
}
function queryError(error){
  console.error(error);
  const msg=error?.code==='42P01'||error?.code==='PGRST205'
    ? 'Thiếu bảng Supabase. Chạy toàn bộ supabase_schema.sql trong SQL Editor, sau đó tải lại trang.'
    : `${error?.message||'Không thể tải dữ liệu.'} Kiểm tra RLS/policy và schema Supabase.`;
  $('#adminNotice').textContent=msg;$('#adminNotice').hidden=false;
}
async function runQuery(query){
  const {data,error}=await query;
  if(error)throw error;
  return data||[];
}

async function verifyAdmin(){
  if(!sb){showGate('Supabase chưa tải được','Không tìm thấy thư viện Supabase. Kiểm tra kết nối mạng/CDN rồi tải lại.');return;}
  try{
    const {data:{session},error:sessionError}=await sb.auth.getSession();
    if(sessionError)throw sessionError;
    if(!session){showGate('Cần đăng nhập','Hãy đăng nhập tài khoản Admin từ trang chủ rồi mở lại dashboard.');return;}
    const {data:{user},error:userError}=await sb.auth.getUser();
    if(userError||!user){showGate('Phiên không hợp lệ','Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại từ trang chủ.');return;}
    const {data:profile,error:profileError}=await sb.from('profiles').select('id,email,role').eq('id',user.id).maybeSingle();
    if(profileError){showGate('Không đọc được hồ sơ',`${profileError.message}. Chạy supabase_schema.sql để tạo/backfill profiles và policy SELECT; sau đó đăng xuất, đăng nhập lại.`);return;}
    if(!profile){showGate('Thiếu hồ sơ người dùng','Auth đã đăng nhập nhưng chưa có profiles row. Chạy supabase_schema.sql (có backfill), sau đó đăng nhập lại.');return;}
    if(profile.role!=='admin'){showGate('Không đủ quyền','Tài khoản này không có role admin trong profiles. Hãy cấp quyền qua SQL Editor, không qua giao diện client.');return;}
    state.user=user;$('#adminEmail').textContent=profile.email||user.email||'Admin';$('#adminAvatar').textContent=(profile.email||user.email||'A').slice(0,1).toUpperCase();
    $('#adminLoading').hidden=true;$('#adminLayout').hidden=false;
    await loadPage('dashboard');
  }catch(error){showGate('Không thể xác thực',error.message||'Lỗi kết nối Supabase.');}
}

function statCard(label,value,foot,icon,glow){return `<article class="stat-card" style="--glow:${glow}"><span class="stat-icon">${icon}</span><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong><span class="stat-foot">${foot}</span></article>`;}
function gameTable(rows){
  if(!rows.length)return '<tr><td colspan="6" class="empty-table">Chưa có game trong cơ sở dữ liệu.</td></tr>';
  return rows.map(game=>`<tr><td><div class="table-title"><span class="thumb">${game.cover_url?`<img class="thumb" src="${esc(game.cover_url)}" alt="" loading="lazy">`:'🎮'}</span><span><strong>${esc(game.title)}</strong><small>${esc(game.developer||'Chưa có nhà phát triển')}</small></span></div></td><td>${esc(game.version||'—')}</td><td>${numberLabel(game.downloads)}</td><td><span class="pill ${game.is_published?'on':'off'}">${game.is_published?'Đang hiển thị':'Đang ẩn'}</span></td><td>${game.is_featured?'<span class="pill on">Nổi bật</span>':'—'}</td><td><div class="table-actions"><button class="mini-button" data-action="edit" data-id="${esc(game.id)}">Sửa</button><button class="mini-button" data-action="publish" data-id="${esc(game.id)}">${game.is_published?'Ẩn':'Hiện'}</button><button class="mini-button" data-action="feature" data-id="${esc(game.id)}">★</button><button class="mini-button danger" data-action="delete" data-id="${esc(game.id)}">Xóa</button></div></td></tr>`).join('');
}
async function loadDashboard(){
  pageContent.innerHTML='<div class="skeleton-row"></div><div class="skeleton-row"></div>';
  try{
    const [games,downloads,profiles,logs,recentDownloads,categories]=await Promise.all([
      runQuery(sb.from('games').select('*',{count:'exact'}).order('created_at',{ascending:false}).limit(100)),
      sb.from('downloads').select('id',{count:'exact',head:true}),
      sb.from('profiles').select('id',{count:'exact',head:true}),
      runQuery(sb.from('admin_logs').select('id,actor_id,action,entity,entity_id,created_at').order('created_at',{ascending:false}).limit(6)),
      runQuery(sb.from('downloads').select('created_at').gte('created_at',new Date(Date.now()-6*86400000).toISOString()).order('created_at',{ascending:true}).limit(5000)),
      runQuery(sb.from('categories').select('id,name').order('sort_order'))
    ]);
    const gameRows=games.data||[];state.items=gameRows;state.categories=categories;
    state.dailyDownloads=recentDownloads;
    const totalGames=games.count??gameRows.length;
    const userCount=profiles.count;
    const totalDownloads=downloads.count;
    const newGames=gameRows.filter(game=>Date.now()-new Date(game.created_at).getTime()<30*86400000).length;
    const activity=logs.length?logs.map(log=>`<div class="activity-row"><span class="activity-icon">${log.action==='delete'?'−':'✦'}</span><span><b>${esc(log.action)} · ${esc(log.entity)}</b><small>${esc(log.entity_id||'')} · Actor ${esc(log.actor_id||'—')}</small></span><time>${dateLabel(log.created_at)}</time></div>`).join(''):'<p class="muted">Chưa có hoạt động được ghi nhận.</p>';
    pageContent.innerHTML=`<div class="welcome-row"><div><h2>Chào mừng trở lại 👋</h2><p>Tổng quan dữ liệu hiện có trong Supabase.</p></div><button class="admin-button primary" data-action="new-game">＋ Thêm game mới</button></div>
      <div class="stats-grid">${statCard('TỔNG SỐ GAME',numberLabel(totalGames),'Game đã lưu trong database','🎮','#8c69ff')}${statCard('TỔNG LƯỢT TẢI',totalDownloads==null?'—':numberLabel(totalDownloads),'Bản ghi bảng downloads','⇩','#62e6e1')}${statCard('TỔNG NGƯỜI DÙNG',userCount==null?'—':numberLabel(userCount),'Hồ sơ đã tạo','♙','#ed83be')}${statCard('LƯỢT TRUY CẬP','—','Cần event tracking backend; không ước lượng phía client','◉','#e7bd69')}</div>
      <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h3>Lượt tải theo ngày</h3><p>7 ngày gần nhất · dựa trên bảng downloads</p></div></div><div class="chart-wrap"><canvas id="downloadChart" aria-label="Biểu đồ lượt tải 7 ngày" role="img"></canvas></div></section><section class="panel"><div class="panel-head"><div><h3>Hoạt động Admin gần đây</h3><p>Audit log do database trigger ghi</p></div><button class="mini-button" data-page="logs">Xem tất cả</button></div><div class="activity-list">${activity}</div></section></div>
      <section class="panel" style="margin-top:14px"><div class="panel-head"><div><h3>Game mới đăng</h3><p>${numberLabel(newGames)} game trong 30 ngày gần nhất</p></div><button class="mini-button" data-page="games">Quản lý game →</button></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Game</th><th>Phiên bản</th><th>Lượt tải</th><th>Trạng thái</th><th>Nổi bật</th><th>Thao tác</th></tr></thead><tbody>${gameTable(gameRows.slice(0,5))}</tbody></table></div></section>`;
    drawDownloadChart(recentDownloads);
  }catch(error){queryError(error);pageContent.innerHTML=`<section class="panel"><h2>Chưa thể tải dashboard</h2><p class="muted">${esc(error.message||'Lỗi truy vấn')}</p><p class="muted">Hãy chạy file <b>supabase_schema.sql</b> trong SQL Editor và xác nhận RLS policy.</p></section>`;}
}
function drawDownloadChart(rows){
  const canvas=$('#downloadChart');if(!canvas)return;
  const rect=canvas.getBoundingClientRect();const ratio=window.devicePixelRatio||1;
  canvas.width=Math.max(1,Math.floor(rect.width*ratio));canvas.height=Math.max(1,Math.floor(rect.height*ratio));
  const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);
  const width=rect.width,height=rect.height,pad={l:25,r:8,t:10,b:25};
  const days=Array.from({length:7},(_,index)=>{const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()-(6-index));return date;});
  const counts=days.map(date=>rows.filter(row=>{const d=new Date(row.created_at);return d.toDateString()===date.toDateString()}).length);
  const max=Math.max(4,...counts),plotH=height-pad.t-pad.b,plotW=width-pad.l-pad.r;
  ctx.font='9px system-ui';ctx.strokeStyle='rgba(255,255,255,.08)';ctx.fillStyle='#817e93';ctx.lineWidth=1;
  for(let i=0;i<4;i++){const y=pad.t+plotH*i/3;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(width-pad.r,y);ctx.stroke();ctx.fillText(String(Math.round(max*(1-i/3))),2,y+3);}
  const points=counts.map((count,index)=>({x:pad.l+plotW*(index+.5)/7,y:pad.t+plotH-(count/max)*plotH}));
  const gradient=ctx.createLinearGradient(0,pad.t,0,height);gradient.addColorStop(0,'rgba(144,105,255,.35)');gradient.addColorStop(1,'rgba(144,105,255,0)');
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineTo(points.at(-1).x,height-pad.b);ctx.lineTo(points[0].x,height-pad.b);ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#9b7aff';ctx.lineWidth=2;ctx.stroke();
  points.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle='#62e6e1';ctx.fill();ctx.fillStyle='#817e93';ctx.textAlign='center';ctx.fillText(`${days[i].getDate()}/${days[i].getMonth()+1}`,p.x,height-7);});
  if(rows.length===0){ctx.fillStyle='#9290a4';ctx.textAlign='center';ctx.fillText('Chưa có lịch sử tải trong 7 ngày qua',width/2,height/2);}
}

async function loadGames(){
  const [games,categories]=await Promise.all([
    runQuery(sb.from('games').select('*').order('created_at',{ascending:false}).limit(200)),
    runQuery(sb.from('categories').select('id,name').order('sort_order'))
  ]);state.items=games;state.categories=categories;
  pageContent.innerHTML=`<div class="table-toolbar"><input class="admin-input search" id="tableSearch" placeholder="Tìm tên game, nhà phát triển..." /><div class="toolbar-actions"><button class="admin-button primary" data-action="new-game">＋ Thêm game mới</button></div></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Game</th><th>Phiên bản</th><th>Lượt tải</th><th>Trạng thái</th><th>Nổi bật</th><th>Thao tác</th></tr></thead><tbody id="gamesTableBody">${gameTable(games)}</tbody></table></div><p class="muted">Hiển thị tối đa 200 bản ghi gần nhất.</p>`;
}
async function loadCategories(){
  const rows=await runQuery(sb.from('categories').select('*').order('sort_order').limit(200));state.items=rows;
  pageContent.innerHTML=`<div class="table-toolbar"><p class="muted">Danh mục được tham chiếu trực tiếp bởi games.category_id.</p><button class="admin-button primary" data-action="new-category">＋ Thêm danh mục</button></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Tên</th><th>Icon</th><th>Thứ tự</th><th>Tạo lúc</th><th>Thao tác</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr><td><strong>${esc(row.name)}</strong></td><td>${esc(row.icon||'—')}</td><td>${esc(row.sort_order)}</td><td>${dateLabel(row.created_at)}</td><td><div class="table-actions"><button class="mini-button" data-action="edit-category" data-id="${esc(row.id)}">Sửa</button><button class="mini-button danger" data-action="delete-category" data-id="${esc(row.id)}">Xóa</button></div></td></tr>`).join(''):'<tr><td colspan="5" class="empty-table">Chưa có danh mục.</td></tr>'}</tbody></table></div>`;
}
async function loadUsers(){
  const rows=await runQuery(sb.from('profiles').select('id,email,username,role,created_at').order('created_at',{ascending:false}).limit(200));state.items=rows;
  pageContent.innerHTML=`<div class="panel-head"><div><h3>Tài khoản người dùng</h3><p>Email, ngày tạo và vai trò từ profiles. Quản lý xác thực mật khẩu trong Supabase Auth.</p></div></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Email</th><th>Username</th><th>Ngày đăng ký</th><th>Vai trò</th><th>Thao tác</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr><td><strong>${esc(row.email||'—')}</strong></td><td>${esc(row.username||'—')}</td><td>${dateLabel(row.created_at)}</td><td><span class="pill ${row.role==='admin'?'on':'off'}">${esc(row.role)}</span></td><td>${row.id===state.user.id?'<span class="muted">Tài khoản hiện tại</span>':`<button class="mini-button" data-action="toggle-role" data-id="${esc(row.id)}" data-role="${esc(row.role)}">${row.role==='admin'?'Hạ xuống User':'Cấp Admin'}</button>`}</td></tr>`).join(''):'<tr><td colspan="5" class="empty-table">Chưa có hồ sơ.</td></tr>'}</tbody></table></div><p class="muted">Không thể tạo, khóa hoặc xóa tài khoản Auth từ frontend. Thao tác xác thực nâng cao cần Supabase Edge Function/backend.</p>`;
}
async function loadDownloads(){
  const rows=await runQuery(sb.from('downloads').select('id,game_id,user_id,created_at,games(title)').order('created_at',{ascending:false}).limit(200));state.items=rows;
  pageContent.innerHTML=`<div class="panel-head"><div><h3>Lịch sử tải gần đây</h3><p>${numberLabel(rows.length)} bản ghi gần nhất (tối đa 200).</p></div></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Game</th><th>User ID</th><th>Thời điểm</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr><td><strong>${esc(row.games?.title||row.game_id)}</strong></td><td>${esc(row.user_id||'Khách')}</td><td>${dateLabel(row.created_at)}</td></tr>`).join(''):'<tr><td colspan="3" class="empty-table">Chưa có bản ghi tải.</td></tr>'}</tbody></table></div><p class="muted">Client không được phép tự tạo lượt tải. Ghi nhận cần Edge Function/backend có xác thực và giới hạn tần suất.</p>`;
}
async function loadFeatured(){
  const rows=await runQuery(sb.from('games').select('*').eq('is_featured',true).order('updated_at',{ascending:false}).limit(200));state.items=rows;
  pageContent.innerHTML=`<div class="table-toolbar"><p class="muted">Bật/tắt dấu nổi bật ngay trong danh sách.</p><button class="admin-button primary" data-page="games">Mở quản lý game</button></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Game</th><th>Phiên bản</th><th>Lượt tải</th><th>Trạng thái</th><th>Nổi bật</th><th>Thao tác</th></tr></thead><tbody>${gameTable(rows)}</tbody></table></div>`;
}
async function loadBanners(){
  const rows=await runQuery(sb.from('banners').select('*').order('sort_order').limit(200));state.items=rows;
  pageContent.innerHTML=`<div class="table-toolbar"><p class="muted">Ảnh có thể tải lên bucket <code>game-assets</code> hoặc dùng URL được cấp phép.</p><button class="admin-button primary" data-action="new-banner">＋ Thêm banner</button></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Tiêu đề</th><th>Ảnh</th><th>Liên kết đích</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr><td><strong>${esc(row.title)}</strong></td><td>${row.image_url?`<a target="_blank" rel="noopener" href="${esc(row.image_url)}">Xem ảnh ↗</a>`:'—'}</td><td>${esc(row.target_url||'—')}</td><td><span class="pill ${row.is_active?'on':'off'}">${row.is_active?'Đang bật':'Đang tắt'}</span></td><td><div class="table-actions"><button class="mini-button" data-action="edit-banner" data-id="${esc(row.id)}">Sửa</button><button class="mini-button danger" data-action="delete-banner" data-id="${esc(row.id)}">Xóa</button></div></td></tr>`).join(''):'<tr><td colspan="5" class="empty-table">Chưa có banner.</td></tr>'}</tbody></table></div>`;
}
async function loadNotifications(){
  const rows=await runQuery(sb.from('notifications').select('*').order('created_at',{ascending:false}).limit(200));state.items=rows;
  pageContent.innerHTML=`<div class="table-toolbar"><p class="muted">Thông báo bảo trì, cập nhật hoặc sự kiện.</p><button class="admin-button primary" data-action="new-notification">＋ Tạo thông báo</button></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Tiêu đề</th><th>Loại</th><th>Nội dung</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr><td><strong>${esc(row.title)}</strong></td><td>${esc(row.kind)}</td><td>${esc(row.body.slice(0,100))}</td><td><span class="pill ${row.is_published?'on':'off'}">${row.is_published?'Đã đăng':'Bản nháp'}</span></td><td><div class="table-actions"><button class="mini-button" data-action="edit-notification" data-id="${esc(row.id)}">Sửa</button><button class="mini-button danger" data-action="delete-notification" data-id="${esc(row.id)}">Xóa</button></div></td></tr>`).join(''):'<tr><td colspan="5" class="empty-table">Chưa có thông báo.</td></tr>'}</tbody></table></div>`;
}
async function loadComments(){
  const rows=await runQuery(sb.from('comments').select('id,game_id,user_id,body,rating,is_visible,created_at,games(title)').order('created_at',{ascending:false}).limit(200));state.items=rows;
  pageContent.innerHTML=`<div class="table-wrap"><table class="admin-table"><thead><tr><th>Game</th><th>Nội dung</th><th>Rating</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr><td>${esc(row.games?.title||row.game_id)}</td><td>${esc(row.body.slice(0,180))}<small style="display:block;margin-top:4px;color:#777">${dateLabel(row.created_at)}</small></td><td>${row.rating?`★ ${row.rating}`:'—'}</td><td><span class="pill ${row.is_visible?'on':'off'}">${row.is_visible?'Hiển thị':'Chờ duyệt'}</span></td><td><div class="table-actions"><button class="mini-button" data-action="comment-toggle" data-id="${esc(row.id)}" data-visible="${row.is_visible}">${row.is_visible?'Ẩn':'Duyệt'}</button><button class="mini-button danger" data-action="comment-delete" data-id="${esc(row.id)}">Xóa</button></div></td></tr>`).join(''):'<tr><td colspan="5" class="empty-table">Chưa có bình luận.</td></tr>'}</tbody></table></div>`;
}
async function loadLogs(){
  const rows=await runQuery(sb.from('admin_logs').select('*').order('created_at',{ascending:false}).limit(200));state.items=rows;
  pageContent.innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Nhật ký hoạt động quản trị</h3><p>Ghi nhận qua trigger cơ sở dữ liệu khi dữ liệu quản trị thay đổi.</p></div></div><div class="activity-list">${rows.length?rows.map(row=>`<div class="activity-row"><span class="activity-icon">✦</span><span><b>${esc(row.action)} · ${esc(row.entity)}</b><small>ID ${esc(row.entity_id||'—')} · ${esc(JSON.stringify(row.details||{}).slice(0,180))}</small></span><time>${dateLabel(row.created_at)}</time></div>`).join(''):'<p class="muted">Chưa có log.</p>'}</div></section>`;
}
async function loadSettings(){
  const rows=await runQuery(sb.from('settings').select('*').order('key').limit(200));state.items=rows;
  pageContent.innerHTML=`<div class="table-toolbar"><p class="muted">Giá trị cấu hình lưu JSONB; tránh lưu bí mật hoặc khóa server ở đây.</p><button class="admin-button primary" data-action="new-setting">＋ Thêm setting</button></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Key</th><th>Value</th><th>Cập nhật</th><th>Thao tác</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr><td><strong>${esc(row.key)}</strong></td><td>${esc(JSON.stringify(row.value).slice(0,160))}</td><td>${dateLabel(row.updated_at)}</td><td><div class="table-actions"><button class="mini-button" data-action="edit-setting" data-id="${esc(row.key)}">Sửa</button><button class="mini-button danger" data-action="delete-setting" data-id="${esc(row.key)}">Xóa</button></div></td></tr>`).join(''):'<tr><td colspan="4" class="empty-table">Chưa có cấu hình.</td></tr>'}</tbody></table></div>`;
}
async function loadStats(){
  const [games,downloads,totalGames]=await Promise.all([
    runQuery(sb.from('games').select('id,title,downloads,is_published').order('downloads',{ascending:false}).limit(10)),
    sb.from('downloads').select('id',{count:'exact',head:true}),
    sb.from('games').select('id',{count:'exact',head:true})
  ]);
  pageContent.innerHTML=`<div class="stats-grid">${statCard('TỔNG GAME',totalGames.count==null?'—':numberLabel(totalGames.count),'Game trong database','🎮','#8c69ff')}${statCard('LƯỢT TẢI ĐÃ GHI',downloads.count==null?'—':numberLabel(downloads.count),'Bảng downloads','⇩','#62e6e1')}${statCard('TRUY CẬP WEBSITE','—','Cần triển khai tracking backend','◉','#e7bd69')}${statCard('TRẠNG THÁI','LIVE','Dữ liệu truy vấn Supabase','●','#58e3bd')}</div><section class="panel"><div class="panel-head"><h3>Game được tải nhiều nhất</h3></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>#</th><th>Game</th><th>Download counter</th><th>Public</th></tr></thead><tbody>${games.map((row,index)=>`<tr><td>${index+1}</td><td><strong>${esc(row.title)}</strong></td><td>${numberLabel(row.downloads)}</td><td>${row.is_published?'Hiển thị':'Ẩn'}</td></tr>`).join('')}</tbody></table></div></section>`;
}
async function loadRoles(){
  const rows=await runQuery(sb.from('profiles').select('id,email,role,created_at').eq('role','admin').order('created_at').limit(200));
  pageContent.innerHTML=`<section class="panel"><div class="panel-head"><div><h3>Quản trị viên</h3><p>Quyền được kiểm tra bởi hàm is_admin() và RLS trong database.</p></div></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>Email</th><th>User ID</th><th>Ngày cấp</th><th>Ghi chú</th></tr></thead><tbody>${rows.map(row=>`<tr><td><strong>${esc(row.email||'—')}</strong></td><td>${esc(row.id)}</td><td>${dateLabel(row.created_at)}</td><td><span class="pill on">Admin</span></td></tr>`).join('')}</tbody></table></div><p class="muted">Cấp admin bằng SQL Editor: UPDATE public.profiles SET role='admin' WHERE email='...'; Không tự cấp quyền qua signup.</p></section>`;
}
async function loadPage(name){
  state.page=name;$('#pageTitle').textContent=pageNames[name]||name;
  document.querySelectorAll('.side-link').forEach(link=>link.classList.toggle('active',link.dataset.page===name));
  $('#adminSidebar').classList.remove('open');$('#adminNotice').hidden=true;
  try{
    if(name==='dashboard')return await loadDashboard();
    if(name==='games')return await loadGames();
    if(name==='categories')return await loadCategories();
    if(name==='users')return await loadUsers();
    if(name==='downloads')return await loadDownloads();
    if(name==='featured')return await loadFeatured();
    if(name==='banners')return await loadBanners();
    if(name==='notifications')return await loadNotifications();
    if(name==='comments')return await loadComments();
    if(name==='logs')return await loadLogs();
    if(name==='settings')return await loadSettings();
    if(name==='stats')return await loadStats();
    if(name==='roles')return await loadRoles();
  }catch(error){queryError(error);pageContent.innerHTML=`<section class="panel"><h2>Không tải được ${esc(pageNames[name])}</h2><p class="muted">${esc(error.message||'Lỗi truy vấn')}</p></section>`;}
}

function field(label,name,value='',type='text',wide=false,required=false){
  return `<div class="field ${wide?'wide':''}"><label for="field-${name}">${label}${required?' *':''}</label><input class="admin-input" id="field-${name}" name="${name}" type="${type}" value="${esc(value??'')}" ${required?'required':''}></div>`;
}
function textareaField(label,name,value='',wide=true){return `<div class="field ${wide?'wide':''}"><label for="field-${name}">${label}</label><textarea class="admin-textarea" id="field-${name}" name="${name}">${esc(value||'')}</textarea></div>`;}
function checkField(label,name,checked){return `<label class="check-field"><input type="checkbox" name="${name}" ${checked?'checked':''}> ${label}</label>`;}
function openEditor(title,fields,record=null,kind=''){
  $('#editorTitle').textContent=title;$('#editorFields').innerHTML=fields;$('#editorForm').dataset.kind=kind;$('#editorForm').dataset.id=record?.id||'';$('#editorDialog').showModal();
}
function gameFields(game={}){
  const options=state.categories.map(cat=>`<option value="${esc(cat.id)}" ${game.category_id===cat.id?'selected':''}>${esc(cat.name)}</option>`).join('');
  return `<div class="form-grid">${field('Tên game','title',game.title,'text',false,true)}${field('Nhà phát triển','developer',game.developer)}${field('Phiên bản','version',game.version)}${field('Dung lượng','size',game.size)}${field('Yêu cầu iOS','ios_requirement',game.ios_requirement)}${field('Trạng thái cập nhật','update_status',game.update_status||'Cập nhật')}
    <div class="field"><label for="field-category_id">Danh mục</label><select class="admin-select" id="field-category_id" name="category_id"><option value="">Chưa phân loại</option>${options}</select></div>
    ${field('Ảnh bìa URL','cover_url',game.cover_url,'url',false)}<div class="field"><label for="coverUpload">Hoặc tải ảnh lên (bucket game-assets)</label><input class="admin-input" id="coverUpload" name="cover_file" type="file" accept="image/*"></div>
    ${field('Link IPA được phép phân phối','ipa_url',game.ipa_url,'url',true)}${textareaField('Mô tả','description',game.description)}<div class="field wide"><div class="form-grid">${checkField('Hiển thị công khai','is_published',game.is_published)}${checkField('Game nổi bật','is_featured',game.is_featured)}</div></div></div>`;
}
function openNewGame(game=null){openEditor(game?'Chỉnh sửa game':'Thêm game mới',gameFields(game||{}),game,'game');}
function openSimpleEditor(kind,record=null){
  if(kind==='category')openEditor(record?'Sửa danh mục':'Thêm danh mục',`<div class="form-grid">${field('Tên danh mục','name',record?.name,'text',false,true)}${field('Icon / emoji','icon',record?.icon)}${field('Thứ tự hiển thị','sort_order',record?.sort_order??0,'number')}</div>`,record,'category');
  if(kind==='banner')openEditor(record?'Sửa banner':'Thêm banner',`<div class="form-grid">${field('Tiêu đề','title',record?.title,'text',false,true)}${field('URL ảnh','image_url',record?.image_url,'url')}${field('Liên kết đích','target_url',record?.target_url,'url')}${field('Thứ tự','sort_order',record?.sort_order??0,'number')}${checkField('Đang hoạt động','is_active',record?.is_active)}</div>`,record,'banner');
  if(kind==='notification')openEditor(record?'Sửa thông báo':'Tạo thông báo',`<div class="form-grid">${field('Tiêu đề','title',record?.title,'text',true,true)}<div class="field"><label>Loại thông báo</label><select class="admin-select" name="kind"><option value="update" ${record?.kind==='update'?'selected':''}>Cập nhật</option><option value="maintenance" ${record?.kind==='maintenance'?'selected':''}>Bảo trì</option><option value="event" ${record?.kind==='event'?'selected':''}>Sự kiện</option></select></div>${checkField('Đăng công khai','is_published',record?.is_published)}${textareaField('Nội dung','body',record?.body)}</div>`,record,'notification');
  if(kind==='setting')openEditor(record?'Sửa setting':'Thêm setting',`<div class="form-grid">${field('Key','key',record?.key,'text',true,true)}${textareaField('Value JSON','value',record?JSON.stringify(record.value,null,2):'{}')}</div>`,record,'setting');
}
async function uploadCover(file){
  if(!file)return null;
  if(file.size>8*1024*1024)throw new Error('Ảnh phải nhỏ hơn 8 MB.');
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');const path=`covers/${crypto.randomUUID()}-${safeName}`;
  const {error}=await sb.storage.from('game-assets').upload(path,file,{upsert:false,contentType:file.type});
  if(error)throw error;
  return sb.storage.from('game-assets').getPublicUrl(path).data.publicUrl;
}
async function saveEditor(event){
  event.preventDefault();const form=event.currentTarget,kind=form.dataset.kind,id=form.dataset.id||null;
  const formData=new FormData(form);const value=Object.fromEntries(formData.entries());
  const button=$('#saveEditor');button.disabled=true;button.textContent='Đang lưu…';
  try{
    let table,payload;
    if(kind==='game'){
      const image=await uploadCover(form.elements.cover_file.files[0]);
      table='games';payload={title:value.title.trim(),developer:value.developer||null,version:value.version||null,size:value.size||null,ios_requirement:value.ios_requirement||null,update_status:value.update_status||'Cập nhật',category_id:value.category_id||null,cover_url:image||value.cover_url||null,ipa_url:value.ipa_url||null,description:value.description||'',is_published:form.elements.is_published.checked,is_featured:form.elements.is_featured.checked};
    }else if(kind==='category'){
      table='categories';payload={name:value.name.trim(),icon:value.icon||null,sort_order:Number(value.sort_order)||0};
    }else if(kind==='banner'){
      table='banners';payload={title:value.title.trim(),image_url:value.image_url||null,target_url:value.target_url||null,sort_order:Number(value.sort_order)||0,is_active:form.elements.is_active.checked};
    }else if(kind==='notification'){
      table='notifications';payload={title:value.title.trim(),body:value.body||'',kind:value.kind,is_published:form.elements.is_published.checked};
    }else if(kind==='setting'){
      let parsed;try{parsed=JSON.parse(value.value||'{}')}catch{throw new Error('Value phải là JSON hợp lệ.');}
      payload={key:value.key.trim(),value:parsed,updated_at:new Date().toISOString()};
      const {error}=await sb.from('settings').upsert(payload,{onConflict:'key'});if(error)throw error;
      $('#editorDialog').close();showToast('Đã lưu cấu hình.');return await loadPage(state.page);
    }else return;
    const query=id?sb.from(table).update(payload).eq('id',id):sb.from(table).insert(payload);
    const {error}=await query;if(error)throw error;
    $('#editorDialog').close();showToast(id?'Đã cập nhật thành công.':'Đã tạo mới thành công.');await loadPage(state.page);
  }catch(error){showToast(error.message||'Không thể lưu. Kiểm tra kết nối và RLS.');}
  finally{button.disabled=false;button.textContent='Lưu thay đổi';}
}
async function removeRecord(table,id,label){
  if(!confirm(`Bạn chắc chắn muốn xóa ${label}? Thao tác này không thể hoàn tác.`))return;
  const {error}=await sb.from(table).delete().eq('id',id);
  if(error){showToast(error.message);return;}
  showToast('Đã xóa.');await loadPage(state.page);
}
async function handleAction(button){
  const action=button.dataset.action,id=button.dataset.id;
  if(action==='new-game')return openNewGame();
  if(action==='edit')return openNewGame(state.items.find(item=>item.id===id));
  if(action==='delete')return removeRecord('games',id,'game');
  if(action==='publish'||action==='feature'){
    const game=state.items.find(item=>item.id===id);if(!game)return;
    const patch=action==='publish'?{is_published:!game.is_published}:{is_featured:!game.is_featured};
    const {error}=await sb.from('games').update(patch).eq('id',id);if(error)showToast(error.message);else{showToast('Đã cập nhật game.');await loadPage(state.page);}return;
  }
  if(action==='new-category')return openSimpleEditor('category');
  if(action==='edit-category')return openSimpleEditor('category',state.items.find(item=>item.id===id));
  if(action==='delete-category')return removeRecord('categories',id,'danh mục');
  if(action==='new-banner')return openSimpleEditor('banner');
  if(action==='edit-banner')return openSimpleEditor('banner',state.items.find(item=>item.id===id));
  if(action==='delete-banner')return removeRecord('banners',id,'banner');
  if(action==='new-notification')return openSimpleEditor('notification');
  if(action==='edit-notification')return openSimpleEditor('notification',state.items.find(item=>item.id===id));
  if(action==='delete-notification')return removeRecord('notifications',id,'thông báo');
  if(action==='new-setting')return openSimpleEditor('setting');
  if(action==='edit-setting')return openSimpleEditor('setting',state.items.find(item=>item.key===id));
  if(action==='delete-setting'){
    if(!confirm(`Xóa cấu hình ${id}?`))return;
    const {error}=await sb.from('settings').delete().eq('key',id);if(error)showToast(error.message);else{showToast('Đã xóa setting.');await loadPage(state.page);}return;
  }
  if(action==='toggle-role'){
    const role=button.dataset.role==='admin'?'user':'admin';
    if(!confirm(`Đổi vai trò tài khoản thành ${role}?`))return;
    const {error}=await sb.from('profiles').update({role}).eq('id',id);if(error)showToast(error.message);else{showToast('Đã cập nhật vai trò.');await loadPage(state.page);}return;
  }
  if(action==='comment-toggle'||action==='comment-delete'){
    if(action==='comment-delete')return removeRecord('comments',id,'bình luận');
    const visible=button.dataset.visible==='true';const {error}=await sb.from('comments').update({is_visible:!visible}).eq('id',id);if(error)showToast(error.message);else{showToast('Đã cập nhật trạng thái bình luận.');await loadPage(state.page);}return;
  }
}

$('#editorForm').addEventListener('submit',saveEditor);
$('#closeEditor').addEventListener('click',()=>$('#editorDialog').close());
$('#cancelEditor').addEventListener('click',()=>$('#editorDialog').close());
$('#signOutButton').addEventListener('click',async()=>{const {error}=await sb.auth.signOut();if(error)showToast(error.message);else window.location.href='index.html';});
$('#sidebarToggle').addEventListener('click',()=>$('#adminSidebar').classList.toggle('open'));
document.addEventListener('click',event=>{
  const nav=event.target.closest('[data-page]');if(nav){loadPage(nav.dataset.page);return;}
  const action=event.target.closest('[data-action]');if(action){handleAction(action);return;}
  if(event.target.id==='editorDialog')$('#editorDialog').close();
});
pageContent.addEventListener('input',event=>{
  if(event.target.id!=='tableSearch')return;
  const query=event.target.value.toLocaleLowerCase('vi');
  const visible=state.items.filter(game=>`${game.title||''} ${game.developer||''}`.toLocaleLowerCase('vi').includes(query));
  const body=$('#gamesTableBody');if(body)body.innerHTML=gameTable(visible);
});
window.addEventListener('resize',()=>{if(state.page==='dashboard')drawDownloadChart(state.dailyDownloads);});
sb?.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')window.location.href='index.html';});
verifyAdmin();
