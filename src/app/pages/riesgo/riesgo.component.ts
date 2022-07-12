import { HttpService } from './../../_services/http.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { lastValueFrom } from 'rxjs';
import * as L from 'leaflet'
import { Map, Control, DomUtil, ZoomAnimEvent, Layer, MapOptions, tileLayer, latLng, circle } from 'leaflet';


@Component({
  selector: 'app-riesgo',
  templateUrl: './riesgo.component.html',
  styleUrls: ['./riesgo.component.scss']
})
export class RiesgoComponent implements OnInit {

  coeficienteRadianes = Math.PI / 180;

  latitud: any;
  longitud: any;

  // leaflet
  leafletLat = -27.3664;
  leafletLang = -55.8940;
  options = {
    layers: [
      tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${}`, {
        tileSize: 512,
        zoomOffset: -1,
        minZoom: 0,
        maxZoom: 21,
        attribution: '© <a href="https://apps.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
      )
    ],
    zoom: 16,
    center: latLng(this.leafletLat, this.leafletLang)
  };
  layers =
    [
      circle([this.leafletLat, this.leafletLang], 100, { color: 'yellow', opacity: 1, fillColor: 'red', fillOpacity: .4 })
    ];
  // leaflet

  lugar: any;

  factorRiesgo = 0;
  situacion = 'Sin Riesgos';

  loadingRiesgo = true;
  loadingProximididad = true;
  loadingClima = true;
  loadingTopoGrafia = true;
  loadingUsoDelSuelo = true;
  loadingFactoresCombinados = true;
  loadingPrediccionPropagacion = true;

  condicionesRiesgo: any[] = [];
  usoDelSuelo: any[] = [];

  // Topografía
  orientacionDeclive = 0;
  anguloInclinacion = 0;

  direccionViento = 0;

  riesgo = '';

  riesgoColor = {
    0: 'gray',
    1: 'gray',
    2: 'gray',
    3: 'gray',
    4: 'gray',
    5: 'danger',
  };

  clima = {
    weatherlocation_lon: 0,
    weatherlocation_lat: 0,
    weatherstationname: 0,
    weatherstationid: 0,
    weathertime: 0,
    temperature: 0,
    temperaturecelsius: 0,
    airpressure: 0,
    airhumidity: 0,
    temperature_min: 0,
    temperature_max: 0,
    windspeed: 0,
    windspeedkmh: 0,
    DireccionViento: 0,
    DireccionVientostring: "",
    cloudcoverage: 0,
    weatherconditionid: 0,
    weatherconditionstring: "",
    weathercondtioniconhtml: "",
    weatherconditiondescription: "",
    weatherconditionicon: "",
    weathertimenormal: "",
    direccionViento: "",
    estacionMeteorologica: "",
    fecha: ""
  };

  factoresCombinados = {
    rv: '',
    rvi: ''
  };

  constructor(private route: ActivatedRoute,
    private httpService: HttpService
  ) { }

  ngOnInit(): void {
    this.route.queryParams
      .subscribe((params: any) => {
        console.log(params); // { orderby: "price" }
        this.latitud = params.latitud;
        this.longitud = params.longitud;

        this.getLugar();

        this.getClima();

        this.calcularSituacionRiesgo();

        this.calcularTopografia();

        this.calcularFactoresCombinados();
      }
      );
  }

  getLugar() {
    this.httpService.get(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=0&zoom=18&lat=${this.latitud}&lon=${this.longitud}`).subscribe((data: any) => {
      this.lugar = data.display_name;
    });
  }


  //////////////////////////////////////   CLIMA      /////////////////////////////////////

  async getClima() {
    await this.httpService.get(`https://api.openweathermap.org/data/2.5/weather?lat=${this.latitud}&lon=${this.longitud}&lang=es&appid=32a020e350d198b03a3acfbcdd355310`).subscribe((data) => {

      // storing json data in variables
      this.clima.weatherlocation_lon = data.coord.lon; // lon WGS84
      this.clima.weatherlocation_lat = data.coord.lat; // lat WGS84
      this.clima.weatherstationname = data.name // Name of Weatherstation
      this.clima.weatherstationid = data.id // ID of Weatherstation
      this.clima.weathertime = data.dt // Time of weatherdata (UTC)
      this.clima.temperature = data.main.temp; // Kelvin
      this.clima.airpressure = data.main.pressure; // hPa
      this.clima.airhumidity = data.main.humidity; // %
      this.clima.temperature_min = data.main.temp_min; // Kelvin
      this.clima.temperature_max = data.main.temp_max; // Kelvin
      this.clima.windspeed = data.wind.speed; // Meter per second
      this.clima.DireccionViento = data.wind.deg; // Wind from direction x degree from north
      this.clima.cloudcoverage = data.clouds.all; // Cloudcoverage in %
      this.clima.weatherconditionid = data.weather[0].id // ID
      this.clima.weatherconditionstring = data.weather[0].main // Weatheartype
      this.clima.weatherconditiondescription = data.weather[0].description // Weatherdescription
      this.clima.weatherconditionicon = data.weather[0].icon // ID of weathericon

      let DireccionViento = data.wind.deg;
      this.direccionViento = data.wind.deg;
      let airhumidity = this.clima.airhumidity;

      // Converting Unix UTC Time
      // var utctimecalc = new Date(this.clima.weathertime * 1000);
      // var months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      // var year = utctimecalc.getFullYear();
      // var month = months[utctimecalc.getMonth()];
      // var date = utctimecalc.getDate();
      // var hour = utctimecalc.getHours();
      // var min = utctimecalc.getMinutes();
      // var sec = utctimecalc.getSeconds();
      // var time = date + '.' + month + '.' + year + ' ' + hour + ':' + min + ' Uhr';
      // this.clima.fecha = time;

      let time = this.clima.weathertime;
      let timezone = 'America/Argentina/Buenos_Aires';
      let currentDate = new Date(time * 1000);
      let date = format(utcToZonedTime(currentDate, timezone), 'dd.MM.yyyy HH:mm');
      this.clima.fecha = date;
      console.log('time', time);

      // recalculating
      this.clima.weathercondtioniconhtml = `https://openweathermap.org/img/w/${this.clima.weatherconditionicon}.png`;
      let weathertimenormal = time; // reallocate time var....
      let temperaturecelsius = Math.round((this.clima.temperature - 273) * 100) / 100;  // Converting Kelvin to Celsius
      let windspeedknots = Math.round((this.clima.windspeed * 1.94) * 100) / 100; // Windspeed from m/s in Knots; Round to 2 decimals
      let windspeedkmh = Math.round((this.clima.windspeed * 3.6) * 100) / 100; // Windspeed from m/s in km/h; Round to 2 decimals
      let DireccionVientostring = "Im the wind from direction"; // Wind from direction x as text

      if (DireccionViento > 348.75 && DireccionViento <= 11.25) {
        DireccionVientostring = "Nore";
      } else if (DireccionViento > 11.25 && DireccionViento <= 33.75) {
        DireccionVientostring = "Nornoreste";
      } else if (DireccionViento > 33.75 && DireccionViento <= 56.25) {
        DireccionVientostring = "Noreste";
      } else if (DireccionViento > 56.25 && DireccionViento <= 78.75) {
        DireccionVientostring = "Estenoreste";
      } else if (DireccionViento > 78.75 && DireccionViento <= 101.25) {
        DireccionVientostring = "Este";
      } else if (DireccionViento > 101.25 && DireccionViento <= 123.75) {
        DireccionVientostring = "Estesudeste";
      } else if (DireccionViento > 123.75 && DireccionViento <= 146.25) {
        DireccionVientostring = "Sudeste";
      } else if (DireccionViento > 146.25 && DireccionViento <= 168.75) {
        DireccionVientostring = "Sursureste";
      } else if (DireccionViento > 168.75 && DireccionViento <= 191.25) {
        DireccionVientostring = "Sur";
      } else if (DireccionViento > 191.25 && DireccionViento <= 213.75) {
        DireccionVientostring = "Sursuroeste";
      } else if (DireccionViento > 213.75 && DireccionViento <= 236.25) {
        DireccionVientostring = "Suroeste";
      } else if (DireccionViento > 236.25 && DireccionViento <= 258.75) {
        DireccionVientostring = "Oestesuroeste";
      } else if (DireccionViento > 258.75 && DireccionViento <= 281.25) {
        DireccionVientostring = "Oeste";
      } else if (DireccionViento > 281.25 && DireccionViento <= 303.75) {
        DireccionVientostring = "Oestenoroeste";
      } else if (DireccionViento > 303.75 && DireccionViento <= 326.25) {
        DireccionVientostring = "Noreste";
      } else if (DireccionViento > 326.25 && DireccionViento <= 348.75) {
        DireccionVientostring = "Nornoroeste";
      } else {
        DireccionVientostring = " - No hay datos actuales del viento - ";
      };

      // Factor 30-30-30 - Peligro
      if ((temperaturecelsius >= 30) && (airhumidity <= 30) && (windspeedkmh >= 30)) {
        this.factorRiesgo = 4;
      };

      this.clima.direccionViento = `${DireccionVientostring} (${DireccionViento}°)`;
      this.clima.estacionMeteorologica = `${this.clima.weatherstationname} (ID: ${this.clima.weatherstationid})`;
      this.clima.temperaturecelsius = temperaturecelsius;
      this.clima.windspeedkmh = windspeedkmh;
      // CondicionesRiesgo.push("Datos del tiempo al : " + weathertimenormal);
      // CondicionesRiesgo.push("Condición: " + weatherconditiondescription);
      // CondicionesRiesgo.push("Temperatura: " + temperaturecelsius + " °C");
      // CondicionesRiesgo.push("Presión atmosférica: " + airpressure + " hPa");
      // CondicionesRiesgo.push("Humedad: " + airhumidity + "%");
      // CondicionesRiesgo.push("Cobertura de Nubes: " + cloudcoverage + "%");
      // CondicionesRiesgo.push("Velocidad del Viento: " + windspeedkmh + " km/h");
      // CondicionesRiesgo.push("Dirección del Viento: " + DireccionVientostring + " (" + DireccionViento + "°)");
      // CondicionesRiesgo.push("Estación Meteorológica: " + weatherstationname + " (ID: " + weatherstationid + ")");

      this.loadingClima = false;
    });
  }


  /// EL CLIMA FINALIZA AQUI ////////////  


  async calcularSituacionRiesgo() {

    await this.hayComunidadAborigen(this.latitud, this.longitud);
    await this.hayReservaNatural(this.latitud, this.longitud);
    await this.hayEstacionServicio(this.latitud, this.longitud);
    await this.hayDepositoGas(this.latitud, this.longitud);
    await this.hayVentaGas(this.latitud, this.longitud);
    await this.hayEscuela(this.latitud, this.longitud);
    await this.hayAserradero(this.latitud, this.longitud);
    await this.hayEstacionTransformadora(this.latitud, this.longitud);
    await this.hayLineaAltoVoltaje(this.latitud, this.longitud);

    // this.esSueloBosque(this.latitud, this.longitud);
    // this.esSueloForestal(this.latitud, this.longitud);

    await this.analizarTipoSuelo(this.latitud, this.longitud);

    ////////////////////////////////////////////////
    // Factor de Riesgo  Descripcion     Color 
    // ---------------------------------------
    //       5           Extremo         Rojo
    //       4           Muy Alto        Naranja
    //       3           Alto            Amarillo
    //       2           Moderado        Verde
    //       1           Bajo            Gris
    //       0           Sin Riesgo      Celeste

    this.loadingRiesgo = false;
    this.loadingProximididad = false;
    this.loadingUsoDelSuelo = false;
  }


  ////////////////////////////////////////////////////////////////////////////////////////////////////
  // Comunidades Aborígenes // 
  async hayComunidadAborigen(latitud: any, longitud: any) {
    await this.httpService.get(`${environment.urlSigMisiones}/datos/aborigenes.geojson`).subscribe((data) => {
      for (let i = 0; i < data.features.length; i++) {
        let LatitudControl = data.features[i].geometry.coordinates[1];
        let LongitudControl = data.features[i].geometry.coordinates[0];
        // Spherical Law of Cosines   // http://www.movable-type.co.uk/scripts/latlong.html
        const Distancia = (Math.acos(Math.sin(latitud * this.coeficienteRadianes) * Math.sin(LatitudControl * this.coeficienteRadianes) + Math.cos(latitud * this.coeficienteRadianes) * Math.cos(LatitudControl * this.coeficienteRadianes) * Math.cos(LongitudControl * this.coeficienteRadianes - longitud * this.coeficienteRadianes)) * 6371000);
        if (Distancia <= 1000) {
          this.factorRiesgo = 5;
          let condicion = "" + data.features[i].properties.name + " a " + parseInt(Distancia.toString()) + " metros";
          this.condicionesRiesgo.push(condicion);
        }
      }
    });
  };

  // Estacion de Servicio // 
  async hayEstacionServicio(latitud: any, longitud: any) {
    await this.httpService.get(`${environment.urlSigMisiones}/datos/combustible.geojson`).subscribe((data) => {
      for (let i = 0; i < data.features.length; i++) {
        let LatitudControl = data.features[i].geometry.coordinates[1];
        let LongitudControl = data.features[i].geometry.coordinates[0];
        // Spherical Law of Cosines   // http://www.movable-type.co.uk/scripts/latlong.html
        const Distancia = (Math.acos(Math.sin(latitud * this.coeficienteRadianes) * Math.sin(LatitudControl * this.coeficienteRadianes) + Math.cos(latitud * this.coeficienteRadianes) * Math.cos(LatitudControl * this.coeficienteRadianes) * Math.cos(LongitudControl * this.coeficienteRadianes - longitud * this.coeficienteRadianes)) * 6371000);

        if (Distancia <= 500) {
          this.factorRiesgo = 4;
          let condicion = "Estación de Servicio " + data.features[i].properties.name + " a " + parseInt(Distancia.toString()) + " metros";
          this.condicionesRiesgo.push(condicion);
        }
      }
    });
    return;
  };



  // Deposito de Gas // 
  async hayDepositoGas(latitud: any, longitud: any) {
    await this.httpService.get(`${environment.urlSigMisiones}/datos/deposito-gas.geojson`).subscribe((data) => {
      for (let i = 0; i < data.features.length; i++) {
        let LatitudControl = data.features[i].geometry.coordinates[1];
        let LongitudControl = data.features[i].geometry.coordinates[0];
        // Spherical Law of Cosines   // http://www.movable-type.co.uk/scripts/latlong.html
        const Distancia = (Math.acos(Math.sin(latitud * this.coeficienteRadianes) * Math.sin(LatitudControl * this.coeficienteRadianes) + Math.cos(latitud * this.coeficienteRadianes) * Math.cos(LatitudControl * this.coeficienteRadianes) * Math.cos(LongitudControl * this.coeficienteRadianes - longitud * this.coeficienteRadianes)) * 6371000);
        if (Distancia <= 500) {
          this.factorRiesgo = 4;
          let condicion = "Depósito de Gas a " + parseInt(Distancia.toString()) + " metros";
          this.condicionesRiesgo.push(condicion);
        }
      }
    });
    return;
  }

  // Venta de Gas // 
  async hayVentaGas(latitud: any, longitud: any) {
    await this.httpService.get(`${environment.urlSigMisiones}/datos/venta-gas.geojson`).subscribe((data) => {
      for (let i = 0; i < data.features.length; i++) {
        let LatitudControl = data.features[i].geometry.coordinates[1];
        let LongitudControl = data.features[i].geometry.coordinates[0];
        // Spherical Law of Cosines   // http://www.movable-type.co.uk/scripts/latlong.html
        const Distancia = (Math.acos(Math.sin(latitud * this.coeficienteRadianes) * Math.sin(LatitudControl * this.coeficienteRadianes) + Math.cos(latitud * this.coeficienteRadianes) * Math.cos(LatitudControl * this.coeficienteRadianes) * Math.cos(LongitudControl * this.coeficienteRadianes - longitud * this.coeficienteRadianes)) * 6371000);
        if (Distancia <= 500) {
          this.factorRiesgo = 4;

          let Nombre = data.features[i].properties.name;

          if (typeof Nombre === 'undefined') {
            Nombre = "";
          }

          let condicion = "Venta de gas " + Nombre + " a " + parseInt(Distancia.toString()) + " metros";
          this.condicionesRiesgo.push(condicion);
        }
      }
    });
    return;
  }




  // Escuelas // 
  async hayEscuela(latitud: any, longitud: any) {
    await this.httpService.get(`${environment.urlSigMisiones}/datos/escuelas.geojson`).subscribe((data) => {
      for (let i = 0; i < data.features.length; i++) {
        var LatitudControl = data.features[i].geometry.coordinates[1];
        var LongitudControl = data.features[i].geometry.coordinates[0];
        // Spherical Law of Cosines   // http://www.movable-type.co.uk/scripts/latlong.html
        const Distancia = ((Math.acos(Math.sin(latitud * this.coeficienteRadianes) * Math.sin(LatitudControl * this.coeficienteRadianes) + Math.cos(latitud * this.coeficienteRadianes) * Math.cos(LatitudControl * this.coeficienteRadianes) * Math.cos(LongitudControl * this.coeficienteRadianes - longitud * this.coeficienteRadianes)) * 6371000));
        if (Distancia <= 500) {
          this.factorRiesgo = 3;
          let condicion = "" + data.features[i].properties.name + " a " + parseInt(Distancia.toString()) + " metros";
          this.condicionesRiesgo.push(condicion);
        }
      }
    });
    return;
  }



  // Aserraderos // 
  async hayAserradero(latitud: any, longitud: any) {
    await this.httpService.get(`${environment.urlSigMisiones}/datos/aserraderos.geojson`).subscribe((data) => {
      for (let i = 0; i < data.features.length; i++) {
        let LatitudControl = data.features[i].geometry.coordinates[1];
        let LongitudControl = data.features[i].geometry.coordinates[0];
        // Spherical Law of Cosines   // http://www.movable-type.co.uk/scripts/latlong.html
        const Distancia = ((Math.acos(Math.sin(latitud * this.coeficienteRadianes) * Math.sin(LatitudControl * this.coeficienteRadianes) + Math.cos(latitud * this.coeficienteRadianes) * Math.cos(LatitudControl * this.coeficienteRadianes) * Math.cos(LongitudControl * this.coeficienteRadianes - longitud * this.coeficienteRadianes)) * 6371000));
        if (Distancia <= 500) {
          this.factorRiesgo = 2;
          let Nombre = data.features[i].properties.name;

          if (typeof Nombre === 'undefined') {
            Nombre = "";
          }

          let condicion = "Aserradero " + Nombre + " a " + parseInt(Distancia.toString()) + " metros";

          this.condicionesRiesgo.push(condicion);
        }
      }
    });

    return;
  }


  // Estacion Transformadora // 
  async hayEstacionTransformadora(latitud: any, longitud: any) {
    await this.httpService.get(`${environment.urlSigMisiones}/datos/estacion-transformadora.geojson`).subscribe((data) => {
      for (let i = 0; i < data.features.length; i++) {
        let LatitudControl = data.features[i].geometry.coordinates[1];
        let LongitudControl = data.features[i].geometry.coordinates[0];
        // Spherical Law of Cosines   // http://www.movable-type.co.uk/scripts/latlong.html
        const Distancia = ((Math.acos(Math.sin(latitud * this.coeficienteRadianes) * Math.sin(LatitudControl * this.coeficienteRadianes) + Math.cos(latitud * this.coeficienteRadianes) * Math.cos(LatitudControl * this.coeficienteRadianes) * Math.cos(LongitudControl * this.coeficienteRadianes - longitud * this.coeficienteRadianes)) * 6371000));
        if (Distancia <= 500) {
          this.factorRiesgo = 3;
          let condicion = "Estacón transformadora de energía" + " a " + parseInt(Distancia.toString()) + " metros";
          this.condicionesRiesgo.push(condicion);
        }
      }
    });
    return;
  }


  // Lineas Alta Tension // 
  async hayLineaAltoVoltaje(latitud: any, longitud: any) {
    let DistanciaMenor = 1000;
    await this.httpService.get(`${environment.urlSigMisiones}/datos/alta-tension.geojson`).subscribe((data) => {
      for (let i = 0; i < data.features.length; i++) {
        for (var j = 0; j < 2; j++) {
          let LatitudControl = data.features[i].geometry.coordinates[j][1];   // coordinates es otro array , hay que volver a recorrer
          let LongitudControl = data.features[i].geometry.coordinates[j][0];
          // Spherical Law of Cosines   // http://www.movable-type.co.uk/scripts/latlong.html
          const Distancia = ((Math.acos(Math.sin(latitud * this.coeficienteRadianes) * Math.sin(LatitudControl * this.coeficienteRadianes) + Math.cos(latitud * this.coeficienteRadianes) * Math.cos(LatitudControl * this.coeficienteRadianes) * Math.cos(LongitudControl * this.coeficienteRadianes - longitud * this.coeficienteRadianes)) * 6371000));
          if (Distancia <= 100) {
            this.factorRiesgo = 1;
            let condicion = "Línea de Alta tensión " + data.features[i].properties.name + " a " + parseInt(Distancia.toString()) + " metros";
            this.condicionesRiesgo.push(condicion);
            if (Distancia <= DistanciaMenor) {  // Terminar de Revisar
              DistanciaMenor = Distancia
            };
          }
        }
      }; // for j
    }); // for i
    return;
  }

  //////////////////////////////////////////////////////////////////////////
  async hayReservaNatural(latitud: any, longitud: any) {
    // let Consulta = 'relation(around:2000,' + Latitud + ',' + Longitud + ')' +
    //   '[boundary=protected_area]' + ';out meta' + ';';
    let queryParam = `relation(around:2000,${latitud},${longitud})[boundary=protected_area];out meta;`
    await this.httpService.get(`${environment.urlOverpassApi}${queryParam}`).subscribe((data) => {
      if (data.elements.length > 0) {
        if (data.elements[0].tags.boundary == "protected_area") {
          this.factorRiesgo = 5;
          let condicion = "Reserva Natural a menos de 2000m";
          let descripcion = data.elements[0].tags.name;
          this.condicionesRiesgo.push(condicion + '. : ' + descripcion);
        }
      }
    });
    return;
  }

  async hayAreaUrbanizada(latitud: any, longitud: any) {
    // var Consulta = 'relation(around:500,' + Latitud + ',' + Longitud + ')' +
    //   '[landuse=residential]' + ';out meta' + ';';
    let queryParam = `relation(around:2000,${latitud},${longitud})[boundary=residential];out meta;`
    await this.httpService.get(`${environment.urlOverpassApi}${queryParam}`).subscribe((data) => {
      if (data.elements.length > 0) {
        if (data.elements[0].tags.landuse == "residential") {
          this.factorRiesgo = 5;
          let condicion = "Zona urbanizada a menos de 500m";
          let descripcion = data.elements[0].tags.name
          this.condicionesRiesgo.push(condicion + '. : ' + descripcion);
        }
      }
    });
    // $.ajax({
    //   url: UrlOverpassApi + Consulta,
    //   async: false,
    //   dataType: 'json',
    //   success(result) {
    //     if (result.elements.length > 0) {
    //       if (result.elements[0].tags.landuse == "residential") {
    //         FactorRiesgo = 5;
    //         Situacion = "Extrema"
    //         Condicion = "Zona urbanizada a menos de 500m"
    //         Descripcion = result.elements[0].tags.name
    //         this.condicionesRiesgo.push(Condicion + '. : ' + Descripcion);
    //       }
    //     }
    //   }
    // });
    return;
  }


  async analizarTipoSuelo(latitud: any, longitud: any) {
    let TipoSuelo = "";

    if (TipoSuelo == "") {
      let Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[natural=wood]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';
      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).subscribe((result) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 4;
          let Condicion = "Foco de calor en un bosque natural";
          // Descripcion = "";
          TipoSuelo = "Bosque";
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.usoDelSuelo.push(Condicion);
        }
      });
      // $.ajax({
      //   url: UrlOverpassApi + Consulta,
      //   async: false,
      //   dataType: 'json',
      //   success(result) {
      //     if (result.elements.length > 0) {
      //       FactorRiesgo = 4;
      //       Situacion = "Alto"
      //       Condicion = "Foco de calor en un bosque natural"
      //       Descripcion = ""
      //       TipoSuelo = "Bosque";
      //       CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
      //     }
      //   }
      // });
    }


    // Plantacion Forestal
    if (TipoSuelo == "") {
      var Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[landuse=forest]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';
      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).subscribe((result) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 4;
          let Condicion = "Foco de calor en una plantacion forestal";
          // Descripcion = ""
          TipoSuelo = "Plantación Forestal";
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.usoDelSuelo.push(Condicion);
        }
      });
      // $.ajax({
      //   url: UrlOverpassApi + Consulta,
      //   async: false,
      //   dataType: 'json',
      //   success(result) {
      //     if (result.elements.length > 0) {
      //       FactorRiesgo = 4;
      //       Situacion = "Alto"
      //       Condicion = "Foco de calor en una plantacion forestal"
      //       Descripcion = ""
      //       TipoSuelo = "Plantación Forestal";
      //       CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
      //     }
      //   }
      // });
    }

    // Plantacion Agricola . Tierra de Cultivo
    if (TipoSuelo == "") {
      var Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[landuse=farmland]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';
      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).subscribe((result) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 3;
          let Condicion = "Foco de calor en un tierras de cultivo"
          // Descripcion = ""
          TipoSuelo = "Plantación agrícola";
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.usoDelSuelo.push(Condicion);
        }
      });
      // $.ajax({
      //   url: UrlOverpassApi + Consulta,
      //   async: false,
      //   dataType: 'json',
      //   success(result) {
      //     if (result.elements.length > 0) {
      //       FactorRiesgo = 3;
      //       Situacion = "Medio"
      //       Condicion = "Foco de calor en un tierras de cultivo"
      //       Descripcion = ""
      //       TipoSuelo = "Plantación agrícola";
      //       CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
      //     }
      //   }
      // });
    }

    // Pastizales
    if (TipoSuelo == "") {
      var Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[natural=grassland]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';
      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).subscribe((result) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 4;
          let Condicion = "Foco de calor en un pastizal";
          // Descripcion = ""
          TipoSuelo = "Pastizal";
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.usoDelSuelo.push(Condicion);
        }
      })
      // $.ajax({
      //   url: UrlOverpassApi + Consulta,
      //   async: false,
      //   dataType: 'json',
      //   success(result) {
      //     if (result.elements.length > 0) {
      //       FactorRiesgo = 4;
      //       Situacion = "Muy Alto"
      //       Condicion = "Foco de calor en un pastizal"
      //       Descripcion = ""
      //       TipoSuelo = "Pastizal";
      //       CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
      //     }
      //   }
      // });
    }

    // Matorrales
    if (TipoSuelo == "") {
      var Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[natural=scrub]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';

      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).subscribe((result) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 2;
          let Condicion = "Foco de calor en un matorral o capuera";
          // Descripcion = ""
          TipoSuelo = "Matorral";
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.usoDelSuelo.push(Condicion);
        }
      });
      // $.ajax({
      //   url: UrlOverpassApi + Consulta,
      //   async: false,
      //   dataType: 'json',
      //   success(result) {
      //     if (result.elements.length > 0) {
      //       FactorRiesgo = 2;
      //       Situacion = "Moderado"
      //       Condicion = "Foco de calor en un matorral o capuera"
      //       Descripcion = ""
      //       TipoSuelo = "Matorral";
      //       CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
      //     }
      //   }
      // });
    }

    // Praderas. Pasturas
    if (TipoSuelo == "") {
      var Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[landuse=meadow]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';
      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).subscribe((result) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 1;
          let Condicion = "Foco de calor en una pradera o pastoreo";
          // Descripcion = ""
          TipoSuelo = "Pradera. Pastoreo";
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.usoDelSuelo.push(Condicion);
        }
      });
      // $.ajax({
      //   url: UrlOverpassApi + Consulta,
      //   async: false,
      //   dataType: 'json',
      //   success(result) {
      //     if (result.elements.length > 0) {
      //       FactorRiesgo = 1;
      //       Situacion = "Bajo"
      //       Condicion = "Foco de calor en una pradera o pastoreo"
      //       Descripcion = ""
      //       TipoSuelo = "Pradera. Pastoreo";
      //       CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
      //     }
      //   }
      // });
    }

    return;
  }

  calcularTopografia() {
    ////////////////////////////////// TOPOGRAFIA //////////////////////////////


    // Coordenadas del Foco de Incendio


    ///////////////////////////////////////////////////////////////
    //  Inclinacion
    ///////////////////////////////////////////////////////////////

    let RadioTierra = 6378.1;
    let Recorrido = 0;
    let Angulo = 0;
    let Distancia = 50; // Diametro de 100 m
    //let Coordenadas = '';
    let CoefRadianes = Math.PI / 180;
    let CoefGrados = 180 / Math.PI;

    //let Coordenadas = LatitudInicio.toFixed(5) + ',' + LongitudInicio.toFixed(5) + '|';	
    let Coordenadas = this.latitud + ',' + this.longitud + '|';

    for (let iteracion = 0; iteracion < 8; iteracion++) {   // Se calculan 8 puntos sobre un circulo de 50 metros

      //var LatIni = LatitudInicio.toFixed(5) * CoefRadianes;
      //var LonIni = LongitudInicio.toFixed(5) * CoefRadianes;
      let LatIni = this.latitud * CoefRadianes;
      let LonIni = this.longitud * CoefRadianes;
      let AngRad = Angulo * CoefRadianes;
      let R = RadioTierra;
      let d = Distancia / 1000;

      // https://izziswift.com/get-lat-long-given-current-point-distance-and-bearing/
      let LatFin = Math.asin(Math.sin(LatIni) * Math.cos(d / R) + Math.cos(LatIni) * Math.sin(d / R) * Math.cos(AngRad));
      let LonFin = LonIni + Math.atan2(Math.sin(AngRad) * Math.sin(d / R) * Math.cos(LatIni), Math.cos(d / R) - Math.sin(LatIni) * Math.sin(LatFin));
      let LatitudFin = LatFin * 180 / Math.PI;
      let LongitudFin = LonFin * 180 / Math.PI;


      Coordenadas = Coordenadas + LatitudFin + ',' + LongitudFin + '|';
      Angulo = Angulo + 45

    }


    // Lectura de los 8 puntos circundantes las coordenadas de origen 
    this.httpService.get(`https://api.opentopodata.org/v1/srtm30m?locations=${Coordenadas}`).subscribe((datos) => {
      // $.getJSON("https://api.opentopodata.org/v1/srtm30m?locations=" + Coordenadas,
      //   function (datos) {

      // Inicializa tabla de alturas. 9 puntos x 3 variables
      var TablaElevaciones = new Array(9);
      for (let i = 0; i < 9; i++) {
        TablaElevaciones[i] = new Array(3);
      }

      var ValMin = 9999;
      var ValMax = -9999;
      var PosicMin = -1;
      var PosicMax = -1;
      for (let i = 0; i < 9; i++) {
        TablaElevaciones[i][0] = datos.results[i].location.lat;
        TablaElevaciones[i][1] = datos.results[i].location.lng;
        TablaElevaciones[i][2] = datos.results[i].elevation;
        if (datos.results[i].elevation <= ValMin) { ValMin = datos.results[i].elevation; PosicMin = i }
        if (datos.results[i].elevation >= ValMax) { ValMax = datos.results[i].elevation; PosicMax = i }

      }

      let DiferenciaAltura = ValMax - ValMin;

      // Calculo de la distancia entre los dos puntos

      let LatIni = TablaElevaciones[PosicMin][0];
      let LonIni = TablaElevaciones[PosicMin][1];

      let LatFin = TablaElevaciones[PosicMax][0];
      let LonFin = TablaElevaciones[PosicMax][1];

      let LatIniRad = LatIni * CoefRadianes;
      let LatFinRad = LatFin * CoefRadianes;

      let Delta = LonFin - LonIni;
      let DeltaRad = Math.PI * Delta / 180;
      let dist = Math.sin(LatIniRad) * Math.sin(LatFinRad) + Math.cos(LatIniRad) * Math.cos(LatFinRad) * Math.cos(DeltaRad);
      if (dist > 1) {
        dist = 1;
      }
      dist = Math.acos(dist);
      dist = dist * CoefGrados;
      dist = dist * 60 * 1.1515;
      dist = parseFloat((dist * 1.609344 * 1000).toFixed(2)); // to meters

      let PorcentajeInclinacion = parseFloat(((DiferenciaAltura / dist) * 100).toFixed(2));
      // - Peligro
      if ((PorcentajeInclinacion >= 35)) { this.factorRiesgo = 4; };
      // CondicionesRiesgo.push("Inclinacion: " +  PorcentajeInclinacion + "%"); 

      // Inclinacion (º) = arctg (altura/distancia)
      let AnguloInclinacion = parseFloat((Math.atan(DiferenciaAltura / dist) * 100).toFixed(2));
      if ((AnguloInclinacion >= 35)) { this.factorRiesgo = 4; };
      // CondicionesRiesgo.push("Inclinacion: " + AnguloInclinacion + "º");
      this.anguloInclinacion = AnguloInclinacion;


      ///////////////////////////////////
      // Orientacion
      ///////////////////////////////////

      let y = Math.sin((LonFin - LonIni) * CoefRadianes) * Math.cos(LatFin * CoefRadianes);
      let x = Math.cos(LatIni * CoefRadianes) * Math.sin(LatFin * CoefRadianes) - Math.sin(LatIni * CoefRadianes) * Math.cos(LatFin * CoefRadianes) * Math.cos((LonFin - LonIni) * CoefRadianes);
      let OrientacionDeclive = parseFloat((((Math.atan2(y, x) * CoefGrados) + 360) % 360).toFixed(2));

      // CondicionesRiesgo.push("Orientacion Declive:  " + OrientacionDeclive + "º");
      this.orientacionDeclive = OrientacionDeclive;

      this.loadingTopoGrafia = false;
      /////// }); // 	$.getJSON("https://api.opentopodatos.org	


      // LA TOPOGRAFIA FINALIZA AQUI ////  
    });
  }

  calcularFactoresCombinados() {
    ////////////////////////////////////////////////////
    // Calculo del factor Viento/Rumbo/Inclinacion (VRI)
    ////////////////////////////////////////////////////
    // Mide la relación entre la orientación y angulo del declive del terreno con la dirección del viento
    // 1 si ambos tienen la misma dirección
    // 0 si tienen direcciones enfrentadas en 180º

    // Calculo del coeficiente Rumbo/Viento  cos(declive) / cos(viento)
    // Resultados: 0 -- 1
    let RV = (Math.abs(Math.cos((this.orientacionDeclive * this.coeficienteRadianes)) + Math.cos((this.direccionViento * this.coeficienteRadianes))) / 2).toFixed(2);
    const e = 2.718281828459045;
    // RVI = ((e ^ x)-1) ^ 2
    // Resultados: 0 --15

    let RVI = ((((e ^ (this.anguloInclinacion * this.coeficienteRadianes)) - 1) ^ 2) * Number(RV)).toFixed(2);

    // CondicionesRiesgo.push('<br><b>Factores Combinados de Topografía y Clima</b>');

    // CondicionesRiesgo.push("Factor RV (Rumbo de la Inclinación/Dirección del Viento):  " + RV + " // Valores: 0=Bajo - 1=Alto");
    // CondicionesRiesgo.push("Factor RVI (Rumbo/Inclinacion/Dirección del Viento): " + RVI + "  Valores: 0 - 15");

    this.factoresCombinados.rv = RV;
    this.factoresCombinados.rvi = RVI;

    this.loadingFactoresCombinados = false;
  }




}
