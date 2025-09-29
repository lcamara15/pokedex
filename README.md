**Pokédex — HTML/CSS (BEM) + JS + PokéAPI**

Una pequeña aplicación web que consulta la PokéAPI y permite explorar Pokemones, ver su detalle, y guardarlos en favoritos de forma persistente con localStorage.
Incluye paginación, filtro por tipo, buscador con lupa, deep-link por hash y detalles visuales para que se sienta rápida y cómoda.  

**¿Qué hace esta app?**

- Explora Pokémon en tarjetas con imagen oficial.
- Busca por nombre o ID (Enter o clic en la lupa).
- Filtra por tipo (fuego, agua, planta, …) usando datos reales de la PokéAPI.
- Abre el detalle con stats (traducidos al español) y datos básicos.
- Marca favoritos (♡/♥): se guardan y persisten en localStorage (clave `dex3_favs`).
- Navega por páginas (Anterior / Siguiente) con contador.
- Deep-link: entra directo con #pikachu o #25 en la URL.
- UI responsiva y con skeletons mientras carga.

**¿Cómo usarla?**

- Buscar: Escribe “pikachu” o “25” y dale a Enter o a la lupa.
- Filtrar: Elige un tipo en el selector (traído de la API).
- Detalles: Click en “Detalles” en cualquier tarjeta.
- Favoritos: Pulsa el corazón (♡ → ♥). Se guardan en localStorage.
- Inicio: Click en el logo “Pokédex” o en el botón Inicio para resetear filtros/búsqueda.
- Enlace directo: Añade #nombre o #id a la URL.

**Aplicación web**

https://lcamara15.github.io/pokedex/


