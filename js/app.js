import TravelRecommender from './model.js';

let recommender = null;
const ACCESS_KEY = '2cmDGYcpKM2Hexq8AZjD2GE34qKwY_l96jxElLXbUEw';

async function initializeRecommender() {
    try {
        console.log('Iniciando carga de datos...');
        const response = await fetch('js/data.json');
        if (!response.ok) {
            throw new Error('No se pudo cargar el archivo de datos.');
        }
        const data = await response.json();
        console.log('Datos cargados exitosamente.');
        
        const centroids = [
            [4.5, 200, 1, 0, 1, 0, 0, 0, 0],
            [4.2, 150, 0, 1, 1, 1, 0, 0, 0],
            [4.8, 300, 1, 1, 1, 0, 0, 1, 0],
            [4.0, 175, 0, 0, 1, 1, 1, 0, 0],
            [4.6, 250, 1, 1, 0, 0, 0, 0, 1],
            [4.3, 225, 0, 1, 1, 0, 0, 1, 0],
            [4.7, 275, 1, 0, 1, 1, 0, 0, 0],
            [4.4, 190, 0, 1, 0, 0, 1, 1, 0]
        ];

        recommender = new TravelRecommender(data, centroids);
        console.log('Recomendador inicializado correctamente.');
        setupEventListeners();
        
    } catch (error) {
        console.error('Error al inicializar el recomendador:', error);
    }
}

function getStars(rating) {
    const fullStar = '★';
    const emptyStar = '☆';
    const total = 5;
    const filled = Math.round(rating);
    return Array(filled).fill(fullStar).concat(Array(total - filled).fill(emptyStar)).join('');
}

async function buscarImagenes(lugar) {
    if (lugar.image_url && lugar.image_url !== "No disponible") {
        try {
            const cleanUrl = decodeURIComponent(lugar.image_url.replace(/\\/g, ''));
            return cleanUrl;
        } catch (error) {
            console.warn(`Error con imagen original:`, error);
        }
    }

    try {
        const query = lugar.nombre;
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=${ACCESS_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            return data.results[0].urls.regular;
        }
    } catch (error) {
        console.error('Error con Unsplash:', error);
    }
    
    return '/img/placeholder.jpg';
}

async function mostrarRecomendaciones(recomendaciones) {
    const container = document.getElementById('recomendaciones');
    container.innerHTML = '';
    container.style.display = 'grid';
    
    if (!recomendaciones || recomendaciones.length === 0) {
        container.className = 'recommendations-container recommendations-1';
        container.innerHTML = `
            <div class="card-recomendacion no-results-card">
                <div class="card-recomendacion-content">
                    <div class="info-container">
                        <h3>Oh no, lo sentimos. No se encontraron destinos.</h3>
                        <p>Intenta ajustando los criterios de búsqueda.</p>
                    </div>
                </div>
            </div>
        `;
        container.classList.add('visible');
        return;
    }

    container.className = `recommendations-container recommendations-${recomendaciones.length}`;

    for (const lugar of recomendaciones) {
        try {
            const imagen = await buscarImagenes(lugar);
            const card = document.createElement('div');
            card.className = 'card-recomendacion';
            
            const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(lugar.nombre)}`;
            const ciudadMostrar = document.getElementById('ciudad').options[document.getElementById('ciudad').selectedIndex].text;

            card.innerHTML = `
                <a href="${googleSearchUrl}" target="_blank" class="google-search-btn" title="Buscar en Google">
                    <img src="img/icon_google.png" alt="Buscar en Google">
                </a>
                <img src="${imagen}" alt="${lugar.nombre}" onerror="this.src='/img/placeholder.jpg'">
                <div class="card-recomendacion-content">
                    <div class="info-container">
                        <h3 class="destination-title">${lugar.nombre}</h3>
                        <div class="stars-container">
                            <div class="stars">${getStars(lugar.calificacion)}</div>
                            <span class="rating-value">(${lugar.calificacion.toFixed(1)})</span>
                        </div>
                        <div class="destination-meta">
                            ${ciudadMostrar} <span class="bullet-separator">•</span> 
                            ${lugar.tipoTurismo} <span class="bullet-separator">•</span> 
                            $${lugar.precio.toLocaleString()}
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(card);
        } catch (error) {
            console.error(`Error al crear tarjeta para ${lugar.nombre}:`, error);
        }
    }

    container.classList.add('visible');
}

function setupEventListeners() {
    const regionSelect = document.getElementById('region');
    const paisSelect = document.getElementById('pais');
    const ciudadSelect = document.getElementById('ciudad');
    const form = document.getElementById('recommendationForm');

    regionSelect.addEventListener('change', () => {
        const selectedRegion = regionSelect.value;
        console.log('Región seleccionada:', selectedRegion);
        const paises = recommender.getCountriesForRegion(selectedRegion);
        console.log('Países obtenidos:', paises);
        
        paisSelect.innerHTML = '<option value="">Selecciona un país</option>';
        paises.forEach(pais => {
            console.log('Añadiendo país:', pais);
            const option = document.createElement('option');
            option.value = pais;
            option.textContent = pais;
            paisSelect.appendChild(option);
        });

        ciudadSelect.innerHTML = '<option value="">Primero selecciona un país</option>';
    });

    paisSelect.addEventListener('change', () => {
        const selectedCountry = paisSelect.value;
        console.log('País seleccionado:', selectedCountry);
        const ciudades = recommender.getCitiesForCountry(selectedCountry);
        console.log('Ciudades obtenidas:', ciudades);

        ciudadSelect.innerHTML = '<option value="">Selecciona una ciudad</option>';
        ciudades.forEach(ciudad => {
            const option = document.createElement('option');
            option.value = ciudad;
            option.textContent = ciudad;
            ciudadSelect.appendChild(option);
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const datos = {
            region: formData.get('region'),
            pais: formData.get('pais'),
            ciudad: formData.get('ciudad'),
            tipoTurismo: formData.get('tipoTurismo'),
            presupuesto: parseFloat(formData.get('presupuesto'))
        };

        if (!recommender) {
            alert('El sistema está cargando. Por favor, espera un momento.');
            return;
        }

        const recomendaciones = recommender.recomendar(
            datos.region,
            datos.pais,
            datos.ciudad,
            datos.tipoTurismo,
            datos.presupuesto
        );

        mostrarRecomendaciones(recomendaciones);
    });
}

// Header scroll effect
let lastScroll = 0;
const header = document.querySelector('.header');
const logo = document.querySelector('.logo');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        logo.classList.add('hidden');
    } else {
        logo.classList.remove('hidden');
    }
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeRecommender);