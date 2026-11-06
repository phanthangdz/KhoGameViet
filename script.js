const SUPABASE_URL = 'https://fjumlujyecxeqpgignxm.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ddQAQd3o_YwwERvxfLSPWw_JbODCeYb';
const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

const games = [
  {id:'wuthering-waves',title:'Wuthering Waves',genre:'Action RPG · Anime',categories:['RPG','Anime','Online'],rating:'4.8',size:'3.2 GB',version:'Thông tin mẫu',downloads:28400,status:'CẬP NHẬT',badge:'HOT',icon:'🌊',mark:'潮',colors:['#3e7cb5','#162545','#76e6e0'],developer:'Kuro Games',ios:'iOS 14 trở lên',updated:'Thông tin cập nhật cần xác nhận',description:'Bước vào một thế giới mở hậu tận thế, khám phá vùng đất rộng lớn và chiến đấu bằng hệ thống hành động tốc độ cao. Đây là nội dung giới thiệu mẫu; hãy kiểm tra thông tin chính thức trước khi cài đặt.'},
  {id:'genshin-impact',title:'Genshin Impact',genre:'Open World · RPG',categories:['RPG','Anime','Online'],rating:'4.7',size:'3.8 GB',version:'Thông tin mẫu',downloads:25100,status:'MỚI',badge:'POPULAR',icon:'✨',mark:'原',colors:['#668ac2','#28244c','#e2c979'],developer:'HoYoverse',ios:'iOS  iOS tương thích',updated:'Thông tin cập nhật cần xác nhận',description:'Khám phá Teyvat, gặp gỡ những nhân vật mới và trải nghiệm một thế giới mở giàu màu sắc. Dung lượng và yêu cầu thực tế có thể thay đổi theo phiên bản.'},
  {id:'stardew-valley',title:'Stardew Valley',genre:'Farming · Offline',categories:['Offline','Premium'],rating:'4.9',size:'420 MB',version:'Thông tin mẫu',downloads:19300,status:'ỔN ĐỊNH',badge:'EDITOR’S PICK',icon:'🌱',mark:'✿',colors:['#597f61','#243e39','#c8dc83'],developer:'ConcernedApe',ios:'Kiểm tra trên App Store',updated:'Thông tin cập nhật cần xác nhận',description:'Rời phố thị và bắt đầu cuộc sống mới tại nông trại của riêng bạn. Trồng trọt, kết bạn, khám phá hang động và tận hưởng nhịp chơi thư thái.'},
  {id:'dead-cells',title:'Dead Cells',genre:'Roguelike · Action',categories:['Offline','Premium'],rating:'4.8',size:'1.1 GB',version:'Thông tin mẫu',downloads:16800,status:'CẬP NHẬT',badge:'TRENDING',icon:'☠️',mark:'☠',colors:['#a54b43','#472332','#f0aa62'],developer:'Motion Twin',ios:'Kiểm tra trên App Store',updated:'Thông tin cập nhật cần xác nhận',description:'Một cuộc phiêu lưu hành động roguelike với nhịp chiến đấu nhanh, bản đồ thay đổi và vô số cách xây dựng nhân vật.'},
  {id:'pubg-mobile',title:'PUBG MOBILE',genre:'Battle Royale · FPS',categories:['FPS','Online'],rating:'4.6',size:'2.4 GB',version:'Thông tin mẫu',downloads:15700,status:'CẬP NHẬT',badge:'POPULAR',icon:'🎯',mark:'PUBG',colors:['#b77a3c','#604020','#f4cc76'],developer:'Level Infinite',ios:'Kiểm tra trên App Store',updated:'Thông tin cập nhật cần xác nhận',description:'Tham gia trận chiến sinh tồn nhiều người chơi, phối hợp cùng đồng đội và tìm chiến thuật để trở thành người sống sót cuối cùng.'},
  {id:'sky-children',title:'Sky: Children of the Light',genre:'Adventure · Social',categories:['Online','Premium'],rating:'4.9',size:'2.0 GB',version:'Thông tin mẫu',downloads:12400,status:'MỚI',badge:'COMMUNITY',icon:'🕊️',mark:'✧',colors:['#527aa3','#292b58','#b2e4ec'],developer:'thatgamecompany',ios:'Kiểm tra trên App Store',updated:'Thông tin cập nhật cần xác nhận',description:'Bay qua những miền đất mộng mơ, kết nối với người chơi khác và cùng nhau khám phá một hành trình giàu cảm xúc.'},
  {id:'vampire-survivors',title:'Vampire Survivors',genre:'Roguelite · Offline',categories:['Offline','Premium'],rating:'4.7',size:'350 MB',version:'Thông tin mẫu',downloads:9800,status:'ỔN ĐỊNH',badge:'HIDDEN GEM',icon:'🦇',mark:'☾',colors:['#79478c','#342147','#d887bb'],developer:'Poncle',ios:'Kiểm tra trên App Store',updated:'Thông tin cập nhật cần xác nhận',description:'Sinh tồn trước từng đợt quái vật, thu thập vật phẩm và thử những cách kết hợp sức mạnh mới trong các màn chơi ngắn đầy bất ngờ.'},
  {id:'honor-of-kings',title:'Honor of Kings',genre:'MOBA · 5v5',categories:['MOBA','Online'],rating:'4.5',size:'1.6 GB',version:'Thông tin mẫu',downloads:8700,status:'CẬP NHẬT',badge:'MULTIPLAYER',icon:'⚔️',mark:'王',colors:['#477d8d','#193349','#a7e4d2'],developer:'Level Infinite',ios:'Kiểm tra trên App Store',updated:'Thông tin cập nhật cần xác nhận',description:'Lập đội, chọn tướng và phối hợp trong những trận MOBA 5v5. Trải nghiệm phụ thuộc vào kết nối mạng và khu vực phát hành.'}
];

const categories = ['RPG','FPS','MOBA','Anime','Offline','Online','Mod','Việt hóa','Premium'];
const state = {query:'',category:'Tất cả',favoritesOnly:false,sort:'featured'};
const catalogGrid = document.getElementById('catalogGrid');
const trendingGrid = document.getElementById('trendingGrid');
const categoryChips = document.getElementById('categoryChips');
const filterChips = document.getElementById('filterChips');
const gameSearch = document.getElementById('gameSearch');
const sortSelect = document.getElementById('sortSelect');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalBody = document.getElementById('modalBody');
const toast = document.getElementById('toast');
let toastTimer;
let favorites = readFavorites();

function readFavorites(){
  try{return JSON.parse(localStorage.getItem('khogame-favorites')||'[]')}catch{return []}
}
function saveFavorites(){
  try{localStorage.setItem('khogame-favorites',JSON.stringify(favorites))}catch{}
}
function formatDownloads(value){return value>=1000?`${(value/1000).toFixed(1).replace('.0','')}K lượt tải`:`${value} lượt tải`}
function gameCard(game,index=0){
  const favorite=favorites.includes(game.id);
  const palette=game.colors;
  return `<article class="game-card" style="--art-bg:linear-gradient(135deg,${palette[0]} 0%,${palette[1]} 88%);--art-glow:${palette[2]};--icon-a:${palette[0]};--icon-b:${palette[1]};animation-delay:${Math.min(index*45,270)}ms">
    <div class="card-art" data-mark="${game.mark}" role="img" aria-label="Hình minh họa ${game.title}"><div class="art-lines"></div><span class="card-badge ${game.badge==='HOT'||game.badge==='TRENDING'?'hot':game.badge==='NEW'?'new':''}">${game.badge}</span><button class="favorite-button ${favorite?'is-favorite':''}" data-favorite="${game.id}" aria-label="${favorite?'Bỏ khỏi':'Thêm vào'} yêu thích" aria-pressed="${favorite}">${favorite?'♥':'♡'}</button><span class="card-icon" aria-hidden="true">${game.icon}</span></div>
    <div class="card-body"><div class="card-title-row"><h3 class="card-title" title="${game.title}">${game.title}</h3><span class="rating">★ ${game.rating}</span></div><div class="card-genre">${game.genre}</div><div class="card-meta"><span>◫ <b>${game.size}</b></span><span>↻ <b>${game.status}</b></span></div><div class="card-footer"><span class="download-count">↓ <span>${formatDownloads(game.downloads)}</span></span><button class="card-detail" data-detail="${game.id}">CHI TIẾT ↗</button></div></div>
  </article>`;
}
function matchesQuery(game){
  const text=[game.title,game.genre,game.developer,game.version,...game.categories].join(' ').toLocaleLowerCase('vi');
  return text.includes(state.query.toLocaleLowerCase('vi').trim());
}
function filteredGames(){
  let list=games.filter(game=>matchesQuery(game));
  if(state.category==='Yêu thích')list=list.filter(game=>favorites.includes(game.id));
  else if(state.category!=='Tất cả')list=list.filter(game=>game.categories.includes(state.category));
  if(state.sort==='rating')list.sort((a,b)=>Number(b.rating)-Number(a.rating));
  if(state.sort==='downloads')list.sort((a,b)=>b.downloads-a.downloads);
  if(state.sort==='newest')list.sort((a,b)=>games.indexOf(a)-games.indexOf(b));
  return list;
}
function renderFilters(){
  const options=['Tất cả','Yêu thích',...categories];
  filterChips.innerHTML=options.map(category=>`<button class="filter-chip ${state.category===category?'selected':''}" data-category="${category}" aria-pressed="${state.category===category}">${category==='Yêu thích'?'♡ ':''}${category}</button>`).join('');
  categoryChips.innerHTML=categories.map(category=>`<button class="category-chip ${state.category===category?'selected':''}" data-category="${category}">${category}</button>`).join('');
}
function renderCatalog(){
  const list=filteredGames();
  catalogGrid.innerHTML=list.map(gameCard).join('');
  document.getElementById('emptyState').hidden=list.length>0;
  document.getElementById('resultsLabel').textContent=`${list.length} tựa game · Nội dung minh họa, vui lòng kiểm tra thông tin chính thức`;
  trendingGrid.innerHTML=games.slice(0,4).map((game,index)=>gameCard(game,index)).join('');
  renderFilters();
}
function showToast(message){
  toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);
}
function openModal(content){
  modalBody.innerHTML=content;modalBackdrop.hidden=false;document.body.style.overflow='hidden';document.getElementById('modalClose').focus();
}
function closeModal(){modalBackdrop.hidden=true;document.body.style.overflow=''}
function detailMarkup(game){
  return `<div class="detail-banner" style="--art-bg:linear-gradient(125deg,${game.colors[0]},${game.colors[1]})" data-mark="${game.mark}"></div><div class="detail-heading"><span class="card-icon" style="--icon-a:${game.colors[0]};--icon-b:${game.colors[1]}">${game.icon}</span><div><h2 id="modalTitle">${game.title}</h2><p>${game.genre} · ★ ${game.rating} · ${game.developer}</p></div></div><p>${game.description}</p><div class="detail-stats"><div class="detail-stat"><small>DUNG LƯỢNG</small><strong>${game.size}</strong></div><div class="detail-stat"><small>PHIÊN BẢN</small><strong>${game.version}</strong></div><div class="detail-stat"><small>TRẠNG THÁI</small><strong>${game.status}</strong></div><div class="detail-stat"><small>YÊU CẦU iOS</small><strong>${game.ios}</strong></div><div class="detail-stat"><small>NHÀ PHÁT TRIỂN</small><strong>${game.developer}</strong></div><div class="detail-stat"><small>CẬP NHẬT</small><strong>${game.updated}</strong></div></div><div class="detail-note"><b>Thông tin tham khảo:</b> Đây là giao diện danh mục mẫu, chưa được kết nối nguồn dữ liệu chính thức. Phiên bản, dung lượng và yêu cầu thiết bị cần được xác minh với nhà phát hành. Chỉ cài đặt từ nguồn được cấp phép.</div><div class="modal-actions"><button class="button button-primary" data-download="${game.id}">Kiểm tra tùy chọn tải <span>↗</span></button><button class="button button-quiet" data-favorite="${game.id}">${favorites.includes(game.id)?'♥ Đã yêu thích':'♡ Thêm yêu thích'}</button></div>`;
}
function openGame(gameId){
  const game=games.find(item=>item.id===gameId);if(!game)return;
  openModal(detailMarkup(game));
}
function openDownloadNotice(gameId){
  const game=games.find(item=>item.id===gameId);if(!game)return;
  openModal(`<div class="notice-icon">↗</div><div class="eyebrow">TRƯỚC KHI TẢI</div><h2 id="modalTitle">Nguồn tải chưa được cấu hình</h2><p>Hiện chưa có liên kết tải được xác minh cho <b>${game.title}</b>. Chúng tôi không cung cấp file game hoặc liên kết không rõ quyền phân phối.</p><div class="notice-box"><b>Để tiếp tục an toàn:</b><br />Tìm game trên App Store hoặc trang chính thức của nhà phát hành. Kiểm tra khu vực, khả năng tương thích và điều khoản sử dụng trước khi cài đặt.</div><div class="modal-actions"><button class="button button-primary" id="noticeOkay">Đã hiểu</button></div>`);
}
function openAccountNotice(admin=false){
  openModal(`<div class="eyebrow">KHO GAME iOS · ${admin?'ADMIN':'MEMBER'}</div><h2 id="modalTitle">Đăng nhập</h2><p>Đăng nhập được xác thực qua Supabase. Quyền quản trị được đọc từ hồ sơ và phải được bảo vệ thêm bằng RLS trong cơ sở dữ liệu.</p><form id="supabaseLoginForm" data-admin="${admin}"><label class="search-box" style="width:100%;margin:15px 0 9px"><input name="email" type="email" placeholder="Email" autocomplete="username" required /></label><label class="search-box" style="width:100%;margin-bottom:12px"><input name="password" type="password" placeholder="Mật khẩu" autocomplete="current-password" required /></label><div class="modal-actions"><button class="button button-primary" type="submit">Đăng nhập</button></div></form><div id="authMessage" role="status"></div><p class="notice-box">Chưa có tài khoản? Tạo user trong Supabase Authentication. Không dùng mật khẩu mặc định và không chia sẻ mật khẩu trong mã nguồn.</p>`);
}
async function submitSupabaseLogin(form){
  const submitButton=form.querySelector('button[type="submit"]');
  if(!supabaseClient){
    document.getElementById('authMessage').textContent='Không tải được thư viện Supabase. Kiểm tra kết nối mạng rồi thử lại.';
    return;
  }
  const message=document.getElementById('authMessage');
  submitButton.disabled=true;
  submitButton.textContent='Đang xác thực…';
  const {data,error}=await supabaseClient.auth.signInWithPassword({
    email:form.elements.email.value.trim(),
    password:form.elements.password.value
  });
  if(error){
    message.textContent=error.message;
    submitButton.disabled=false;
    submitButton.textContent='Đăng nhập';
    return;
  }
  const {data:profile,error:profileError}=await supabaseClient
    .from('profiles').select('role').eq('id',data.user.id).single();
  if(profileError){
    const missingProfile=profileError.code==='PGRST116';
    message.textContent=missingProfile
      ? 'Đăng nhập Supabase thành công nhưng chưa có dòng hồ sơ. Chạy supabase_schema.sql trong SQL Editor để tạo/backfill profiles, sau đó đăng xuất và đăng nhập lại.'
      : `Không đọc được hồ sơ (${profileError.code||'lỗi truy vấn'}): ${profileError.message}. Kiểm tra bảng profiles và policy SELECT cho hồ sơ của chính user.`;
    submitButton.disabled=false;
    submitButton.textContent='Đăng nhập';
    return;
  }
  const adminOnly=form.dataset.admin==='true';
  if(adminOnly&&profile.role!=='admin'){
    message.textContent='Tài khoản đã đăng nhập nhưng chưa được cấp quyền quản trị. Cấp role admin bằng SQL Editor, không từ giao diện người dùng.';
    return;
  }
  if(profile.role==='admin'){
    window.location.href='admin.html';
    return;
  }
  modalBody.innerHTML=`<div class="eyebrow">SUPABASE AUTH</div><h2 id="modalTitle">Đăng nhập thành công</h2><p>${data.user.email}</p><div class="notice-box">Tài khoản chưa có quyền quản trị. Yêu thích hiện vẫn được lưu cục bộ trên thiết bị.</div><div class="modal-actions"><button class="button button-primary" id="supabaseSignOut">Đăng xuất</button></div>`;
}

document.addEventListener('click',event=>{
  const favoriteButton=event.target.closest('[data-favorite]');
  if(favoriteButton){
    const id=favoriteButton.dataset.favorite;
    favorites=favorites.includes(id)?favorites.filter(item=>item!==id):[...favorites,id];
    saveFavorites();renderCatalog();
    if(!modalBackdrop.hidden){const game=games.find(item=>item.id===id);if(game)modalBody.innerHTML=detailMarkup(game)}
    showToast(favorites.includes(id)?'Đã thêm vào danh sách yêu thích':'Đã xóa khỏi danh sách yêu thích');return;
  }
  const categoryButton=event.target.closest('[data-category]');
  if(categoryButton){state.category=categoryButton.dataset.category;renderCatalog();document.getElementById('catalog').scrollIntoView({behavior:'smooth'});return}
  const detailButton=event.target.closest('[data-detail]');
  if(detailButton){openGame(detailButton.dataset.detail);return}
  const downloadButton=event.target.closest('[data-download]');
  if(downloadButton){openDownloadNotice(downloadButton.dataset.download);return}
  if(event.target.closest('#supabaseSignOut')){supabaseClient.auth.signOut().then(({error})=>{if(error)showToast(error.message);else{closeModal();showToast('Đã đăng xuất')}});return}
  if(event.target.closest('#noticeOkay')){closeModal();return}
  if(event.target.closest('#loginButton')){openAccountNotice(false);return}
  if(event.target.closest('#adminButton')){event.preventDefault();openAccountNotice(true);return}
  if(event.target===modalBackdrop||event.target.closest('#modalClose'))closeModal();
});

document.addEventListener('submit',event=>{
  if(event.target.id==='supabaseLoginForm'){
    event.preventDefault();
    submitSupabaseLogin(event.target);
  }
});

gameSearch.addEventListener('input',()=>{state.query=gameSearch.value;renderCatalog()});
sortSelect.addEventListener('change',()=>{state.sort=sortSelect.value;renderCatalog()});
document.getElementById('clearFilter').addEventListener('click',()=>{state.category='Tất cả';state.query='';gameSearch.value='';renderCatalog()});
document.getElementById('resetSearch').addEventListener('click',()=>{state.category='Tất cả';state.query='';gameSearch.value='';renderCatalog()});
document.getElementById('searchToggle').addEventListener('click',()=>{document.getElementById('catalog').scrollIntoView({behavior:'smooth'});setTimeout(()=>gameSearch.focus(),350)});
document.getElementById('menuToggle').addEventListener('click',event=>{const button=event.currentTarget;const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));document.getElementById('mainNav').classList.toggle('open',open)});
document.querySelectorAll('.main-nav a').forEach(link=>link.addEventListener('click',()=>{document.getElementById('mainNav').classList.remove('open');document.getElementById('menuToggle').setAttribute('aria-expanded','false')}));
document.addEventListener('keydown',event=>{
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();document.getElementById('searchToggle').click()}
  if(event.key==='Escape'){closeModal();document.getElementById('mainNav').classList.remove('open');document.getElementById('menuToggle').setAttribute('aria-expanded','false')}
});

renderCatalog();
window.setTimeout(()=>document.getElementById('loadingScreen').classList.add('loaded'),550);
