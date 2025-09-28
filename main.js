// ===== Pokedex =====
// Extras dentro del alcance:
// - Paginación (limit/offset)       - Filtro por tipo (select desde API) [EN->ES]
// - Búsquedas recientes (chips)      - Limpiar favoritos 
// - Skeleton loaders                 - Imágenes desde PokeAPI (official-artwork)
// - Reintentar en errores            

const API = "https://pokeapi.co/api/v2/";
const $list = document.getElementById("list");
const $detail = document.getElementById("detail");
const $favList = document.getElementById("favList");
const $form = document.getElementById("searchForm");
const $q = document.getElementById("q");
const $seedBtn = document.getElementById("seedBtn");
const $tpl = document.getElementById("tplCard");
const $skTpl = document.getElementById("tplSkeleton");
const $listInfo = document.getElementById("listInfo");
const $prevBtn = document.getElementById("prevBtn");
const $nextBtn = document.getElementById("nextBtn");
const $typeFilter = document.getElementById("typeFilter");
const $recentChips = document.getElementById("recentChips");
const $clearFavsBtn = document.getElementById("clearFavsBtn");
const $homeBtn = document.getElementById("homeBtn");


const PAGE_LIMIT = 24;
let offset = 0;
let currentType = "";
let controller = null;

// Colores por tipo (principal = p.types[0])
const TYPE_COLOR = {
  normal:  "#9aa0a6",
  Lucha:   "#c22e28",   
  fighting:"#c22e28",
  Volador: "#a98ff3",   
  flying:  "#a98ff3",
  Veneno:  "#a33ea1",   
  poison:  "#a33ea1",
  Tierra:  "#e2bf65",   
  ground:  "#e2bf65",
  Roca:    "#b6a136",   
  rock:    "#b6a136",
  Bicho:   "#a6b91a",   
  bug:     "#a6b91a",
  Fantasma:"#735797",   
  ghost:   "#735797",
  Acero:   "#b7b7ce",   
  steel:   "#b7b7ce",
  Fuego:   "#ee8130",   
  fire:    "#ee8130",
  Agua:    "#6390f0",   
  water:   "#6390f0",
  Planta:  "#7ac74c",   
  grass:   "#7ac74c",
  Eléctrico:"#f7d02c",  
  electric:"#f7d02c",
  Psíquico:"#f95587",   
  psychic: "#f95587",
  Hielo:   "#96d9d6",   
  ice:     "#96d9d6",
  Dragón:  "#6f35fc",   
  dragon:  "#6f35fc",
  Siniestro:"#705746",  
  dark:    "#705746",
  Hada:    "#d685ad",   
  fairy:   "#d685ad",
  Estelar: "#f59e0b",   
  stellar: "#f59e0b",
};

function colorForType(p){

  const en = p.types?.[0]?.type?.name ?? "";
  const es = (typeof tType === "function") ? tType(en) : en;
  return TYPE_COLOR[en] || TYPE_COLOR[es] || "#f59e0b"; 
}


// ===== Traducción de tipos EN -> ES (Ya que PokeAPI usa inglés) =====
const TYPE_ES = {
  normal: "Normal",
  fighting: "Lucha",
  flying: "Volador",
  poison: "Veneno",
  ground: "Tierra",
  rock: "Roca",
  bug: "Bicho",
  ghost: "Fantasma",
  steel: "Acero",
  fire: "Fuego",
  water: "Agua",
  grass: "Planta",
  electric: "Eléctrico",
  psychic: "Psíquico",
  ice: "Hielo",
  dragon: "Dragón",
  dark: "Siniestro",
  fairy: "Hada",
  stellar: "Estelar",
  shadow: "Sombra",
  unknown: "Desconocido",
};
const tType = (name) => TYPE_ES[name] ?? name;

const STAT_ES = {
  hp: "PS",
  attack: "Ataque",
  defense: "Defensa",
  "special-attack": "Ataque especial",
  "special-defense": "Defensa especial",
  speed: "Velocidad",
};
const tStat = (name) => STAT_ES[name] ?? name;


// ===== Favoritos y recientes =====
const FAV_KEY = "dex3_favs";
const RECENT_KEY = "dex3_recent";
const favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
let recent = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); // array de strings
function saveFavs(){ localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); }
function saveRecent(){ localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0,8))); }
function addRecent(q){
  const v = String(q).toLowerCase().trim();
  if (!v) return;
  recent = [v, ...recent.filter(x=>x!==v)].slice(0,8);
  saveRecent(); renderRecent();
}
function renderRecent(){
  if (!recent.length){ $recentChips.innerHTML = ""; return; }
  $recentChips.innerHTML = recent.map(r=>`<button class="dex__chip" data-q="${r}">${r}</button>`).join("");
  $recentChips.querySelectorAll(".dex__chip").forEach(btn=>{
    btn.addEventListener("click", ()=>{ $q.value = btn.dataset.q; searchSubmit(); });
  });
}

// ===== Fetch helpers =====
function abortOngoing(){
  if (controller) controller.abort();
  controller = new AbortController();
  return controller.signal;
}
async function api(url){
  const signal = abortOngoing();
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Error de red");
  return res.json();
}

// ===== API helpers =====
function spriteOf(p){
  return p.sprites?.other?.["official-artwork"]?.front_default
      || p.sprites?.front_default
      || "";
}
function typesHTML(p){ return p.types.map(t=>`<li>${tType(t.type.name)}</li>`).join(""); }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

async function getOne(query){
  const q = String(query).trim().toLowerCase();
  if (!q) throw new Error("Vacío");
  return api(`${API}pokemon/${q}`);
}
async function getPage(limit=PAGE_LIMIT, offsetVal=0){
  const data = await api(`${API}pokemon?limit=${limit}&offset=${offsetVal}`);
  const details = await Promise.all(data.results.map(r => fetch(r.url).then(x=>x.json())));
  return { details, count: data.count };
}
async function getTypes(){
  const data = await api(`${API}type`);
  return data.results.map(t=>t.name);
}
async function getByType(type, limit=PAGE_LIMIT, offsetVal=0){
  const data = await api(`${API}type/${type}`);
  const all = data.pokemon.map(p=>p.pokemon); // [{name,url},...]
  const slice = all.slice(offsetVal, offsetVal+limit);
  const details = await Promise.all(slice.map(r => fetch(r.url).then(x=>x.json())));
  return { details, count: all.length };
}

// ===== Render =====
function skeletonList(n=8){
  const frag = document.createDocumentFragment();
  for (let i=0;i<n;i++){
    frag.appendChild($skTpl.content.firstElementChild.cloneNode(true));
  }
  $list.innerHTML = "";
  $list.appendChild(frag);
}
function card(p){
  const node = $tpl.content.firstElementChild.cloneNode(true);
  const img = node.querySelector(".card__img");
  const name = node.querySelector(".card__name");
  const types = node.querySelector(".card__types");
  const more = node.querySelector(".card__more");
  const fav = node.querySelector(".card__fav");
  const c = colorForType(p);
  node.style.setProperty("--type", c);


  name.textContent = `#${p.id} ${cap(p.name)}`;
  img.src = spriteOf(p);
  img.alt = p.name;
  types.innerHTML = typesHTML(p);

  if (favs.has(p.id)){ node.classList.add("card--fav"); fav.classList.add("is-on"); }

  more.addEventListener("click", ()=> showDetail(p, true));
  fav.addEventListener("click", ()=>{
    if (favs.has(p.id)) favs.delete(p.id); else favs.add(p.id);
    saveFavs(); renderFavs();
    node.classList.toggle("card--fav");
    fav.classList.toggle("is-on");
  });

  return node;
}
function renderList(items, pageInfo){
  if (!items?.length){ $list.innerHTML = "<p>No hay ningún resultado.</p>"; return; }
  const frag = document.createDocumentFragment();
  items.forEach(p => frag.appendChild(card(p)));
  $list.innerHTML = "";
  $list.appendChild(frag);
  const start = pageInfo.offset + 1;
  const end = Math.min(pageInfo.offset + pageInfo.limit, pageInfo.count);
  $listInfo.textContent =
    `Mostrando ${start}-${end} de ${pageInfo.count}` +
    (currentType ? ` · tipo: ${tType(currentType)}` : "");
}

function showDetail(p, updateHash=false){
  // Construir barras de stats con los respectivos nombres
  const stats = p.stats.map(s=>{
    const w = Math.min(100, Math.round((s.base_stat/180)*100)); // ancho aproximado
    const label = tStat(s.stat.name); // traducción
    return `<div class="stat">
      <div>${label} (${s.base_stat})</div>
      <div style="height:8px;background:#142032;border-radius:6px;overflow:hidden">
        <i style="display:block;height:100%;width:${w}%;background:linear-gradient(90deg,#60a5fa,#34d399)"></i>
      </div>
    </div>`;
  }).join("");

  // Tipos en español
  const tiposES = p.types.map(t=>tType(t.type.name)).join(", ");

  //  Unidades para altura/peso
  const alturaM = (p.height/10).toFixed(1); // Decímetros
  const pesoKg  = (p.weight/10).toFixed(1); // Hectogramos

  $detail.innerHTML = `
    <div class="detail">
      <div class="detail__head" style="display:flex;gap:10px;align-items:center">
        <img src="${spriteOf(p)}" alt="${p.name}"
             style="width:120px;height:120px;object-fit:contain;background:#0b1120;border:1px solid #1e2a43;border-radius:10px" />
        <div>
          <h2 style="margin:0">#${p.id} ${cap(p.name)}</h2>
          <div class="dex__muted">
            Tipos: ${tiposES} · Altura: ${alturaM} m · Peso: ${pesoKg} kg
          </div>
        </div>
      </div>
      <div class="detail__stats" style="display:grid;gap:6px;margin-top:8px">
        ${stats}
      </div>
    </div>
  `;
  if (updateHash) location.hash = `#${p.name}`;
}

// ===== Favoritos =====
async function renderFavs(){
  if (!favs.size){ $favList.innerHTML = "<p class='dex__muted'>Sin favoritos.</p>"; return; }
  const ids = [...favs].slice(0, 24);
  const results = await Promise.allSettled(ids.map(id => fetch(`${API}pokemon/${id}`).then(r=>r.json())));
  const ok = results.filter(r=>r.status==="fulfilled").map(r=>r.value);
  const frag = document.createDocumentFragment();
  ok.forEach(p => frag.appendChild(card(p)));
  $favList.innerHTML = "";
  $favList.appendChild(frag);
}
$clearFavsBtn.addEventListener("click", ()=>{
  favs.clear(); saveFavs(); renderFavs();
});

// ===== Listado con paginación y filtro =====
async function loadPage(){
  try{
    skeletonList(8);
    let payload;
    if (currentType) payload = await getByType(currentType, PAGE_LIMIT, offset);
    else payload = await getPage(PAGE_LIMIT, offset);
    renderList(payload.details, { limit: PAGE_LIMIT, offset, count: payload.count });
  }catch(e){
    $list.innerHTML = `<div><p>Error al cargar la lista.</p><button class="dex__btn" id="retryBtn">Reintentar</button></div>`;
    document.getElementById("retryBtn")?.addEventListener("click", loadPage);
  }
}
$prevBtn.addEventListener("click", ()=>{ offset = Math.max(0, offset - PAGE_LIMIT); loadPage(); });
$nextBtn.addEventListener("click", ()=>{ offset += PAGE_LIMIT; loadPage(); });

function goHome(){
  // Para el reset de estado y que cargue nuevamente la primera página
  offset = 0;
  currentType = "";
  if (typeof $typeFilter !== "undefined" && $typeFilter) $typeFilter.value = "";
  if (typeof $q !== "undefined" && $q) $q.value = "";
  location.hash = ""; 
  if ($detail) $detail.innerHTML = `<p class="dex__muted">Selecciona un Pokémon para ver detalles.</p>`;
  loadPage(); 
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$homeBtn?.addEventListener("click", (e)=>{
  e.preventDefault();
  goHome();
});


// Botón "Cargar": vuelve al inicio y recarga la lista
$seedBtn.addEventListener("click", (e)=>{
  e.preventDefault();
  // Reset de estado
  offset = 0;
  currentType = "";
  if ($typeFilter) $typeFilter.value = "";
  $q.value = "";
  location.hash = ""; 
  $detail.innerHTML = `<p class="dex__muted">Selecciona un Pokémon para ver detalles.</p>`;
  loadPage();         // Solamente regarca la primera página 
  window.scrollTo({ top: 0, behavior: "smooth" });
});


async function populateTypes(){
  try{
    const types = await getTypes();
    $typeFilter.innerHTML =
      `<option value="">Todos los tipos</option>` +
      types.map(t=>`<option value="${t}">${tType(t)}</option>`).join("");
  }catch{ /* opcional */ }
}
$typeFilter.addEventListener("change", ()=>{
  currentType = $typeFilter.value; // Value en inglés para la API
  offset = 0;
  loadPage();
});

// ===== Búsqueda y hash =====
$form.addEventListener("submit", (e)=>{ e.preventDefault(); searchSubmit(); });
function searchSubmit(){
  const query = $q.value.trim();
  if (!query) return;
  addRecent(query);
  (async ()=>{
    try{
      skeletonList(6);
      const p = await getOne(query);
      renderList([p], {limit:1, offset:0, count:1});
      showDetail(p, true);
    }catch(e){
      $list.innerHTML = `<div><p>${e.message || "No encontrado"}</p><button class="dex__btn" id="retrySearch">Reintentar</button></div>`;
      document.getElementById("retrySearch")?.addEventListener("click", searchSubmit);
      $detail.innerHTML = `<p class="dex__muted">Sin detalle.</p>`;
    }
  })();
}
window.addEventListener("hashchange", ()=>{
  const h = location.hash.slice(1);
  if (!h) return;
  $q.value = h;
  searchSubmit();
});

// ===== Init =====
(async function init(){
  renderFavs();
  renderRecent();
  await populateTypes();
  if (location.hash){
    const h = location.hash.slice(1);
    $q.value = h;
    searchSubmit();
  }else{
    loadPage();
  }
})();

