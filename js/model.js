class TravelRecommender {
    constructor(data, centroids) {
        this.data = data;
        this.centroids = centroids;
        this.countryByRegion = this.organizeCountriesByRegion();
        this.cityByCountry = this.organizeCitiesByCountry();
    }

    organizeCountriesByRegion() {
        const regionMap = {};
        
        // Normalizar nombres de regiones (quitar acentos y espacios)
        const normalizeText = (text) => {
            return text.normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/\s+/g, "_")
                      .toLowerCase();
        };

        this.data.forEach(place => {
            Object.keys(place).forEach(key => {
                if (key.startsWith('region_') && place[key] === 1) {
                    const regionOriginal = key.replace('region_', '');
                    if (!regionMap[regionOriginal]) {
                        regionMap[regionOriginal] = new Set();
                    }
                    
                    Object.keys(place).forEach(countryKey => {
                        if (countryKey.startsWith('pais_') && place[countryKey] === 1) {
                            const country = countryKey.replace('pais_', '');
                            regionMap[regionOriginal].add(country);
                        }
                    });
                }
            });
        });

        // Convertir Sets a arrays ordenados
        Object.keys(regionMap).forEach(region => {
            regionMap[region] = Array.from(regionMap[region]).sort();
        });

        console.log('Regiones y países organizados:', regionMap);
        return regionMap;
    }

    organizeCitiesByCountry() {
        const cityMap = {};
        
        this.data.forEach(place => {
            Object.keys(place).forEach(key => {
                if (key.startsWith('pais_') && place[key] === 1) {
                    const country = key.replace('pais_', '');
                    if (!cityMap[country]) {
                        cityMap[country] = new Set();
                    }

                    Object.keys(place).forEach(cityKey => {
                        if (cityKey.startsWith('ciudad_') && place[cityKey] === 1) {
                            const city = cityKey.replace('ciudad_', '');
                            cityMap[country].add(city);
                        }
                    });
                }
            });
        });

        Object.keys(cityMap).forEach(country => {
            cityMap[country] = Array.from(cityMap[country]).sort();
        });

        console.log('Ciudades por país organizadas:', cityMap);
        return cityMap;
    }

    getCountriesForRegion(region) {
        console.log('Buscando países para región:', region);
        const countries = this.countryByRegion[region] || [];
        console.log('Países encontrados:', countries);
        return countries;
    }

    getCitiesForCountry(country) {
        console.log('Buscando ciudades para país:', country);
        const cities = this.cityByCountry[country] || [];
        console.log('Ciudades encontradas:', cities);
        return cities;
    }

    standardizeFeatures(lugar) {
        const features = [
            lugar.Calificación,
            lugar.Precio,
            lugar.Relajación || 0,
            lugar.Aventura || 0,
            lugar.Cultural || 0,
            lugar.Histórico || 0,
            lugar.Espiritual || 0,
            lugar.Gastronómico || 0,
            lugar.Entretenimiento || 0
        ];
        
        return features;
    }

    euclideanDistance(point1, point2) {
        return Math.sqrt(
            point1.reduce((sum, value, i) => 
                sum + Math.pow(value - point2[i], 2), 0)
        );
    }

    findCluster(features) {
        let minDistance = Infinity;
        let closestCluster = 0;

        this.centroids.forEach((centroid, i) => {
            const distance = this.euclideanDistance(features, centroid);
            if (distance < minDistance) {
                minDistance = distance;
                closestCluster = i;
            }
        });

        return closestCluster;
    }


    recomendar(region, pais, ciudad, tipoTurismo, presupuesto) {
        console.log('Buscando recomendaciones con:', { region, pais, ciudad, tipoTurismo, presupuesto });
        
        if (!region || !pais || !ciudad || !tipoTurismo || !presupuesto) {
            console.log('Parámetros incompletos');
            return [];
        }
    
        try {
            let filtrados = this.data.filter(lugar => {
                return lugar[`region_${region}`] === 1 && 
                       lugar[`pais_${pais}`] === 1 &&
                       lugar[`ciudad_${ciudad}`] === 1 &&
                       lugar[tipoTurismo] === 1 &&
                       lugar.Precio <= presupuesto;
            });
    
            if (filtrados.length === 0) {
                console.log('No se encontraron lugares que coincidan con los criterios');
                return [];
            }
    
            filtrados.forEach(lugar => {
                const features = this.standardizeFeatures(lugar);
                lugar.cluster = this.findCluster(features);
            });
    
            const recomendados = [];
            const clustersUsados = new Set();
    
            filtrados.sort((a, b) => b.Calificación - a.Calificación);
    
            for (const lugar of filtrados) {
                if (recomendados.length < 3) {
                    recomendados.push({
                        nombre: lugar.Nombre,
                        tipoTurismo: tipoTurismo,
                        calificacion: lugar.Calificación,
                        precio: lugar.Precio,
                        image_url: lugar.image_url || 'No disponible'
                    });
                    clustersUsados.add(lugar.cluster);
                }
            }
    
            console.log('Lugares recomendados:', recomendados);
            return recomendados;
        } catch (error) {
            console.error('Error al generar recomendaciones:', error);
            return [];
        }
    }
}
    
export default TravelRecommender;