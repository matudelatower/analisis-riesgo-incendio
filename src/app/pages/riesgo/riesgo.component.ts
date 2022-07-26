import { HttpService } from './../../_services/http.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import * as L from 'leaflet'
import { Map, Control, DomUtil, ZoomAnimEvent, Layer, MapOptions, tileLayer, latLng, circle } from 'leaflet';


@Component({
  selector: 'app-riesgo',
  templateUrl: './riesgo.component.html',
  styleUrls: ['./riesgo.component.scss']
})
export class RiesgoComponent implements OnInit {

  coeficienteRadianes = Math.PI / 180;
  // e = 2.718281828459045;
  e = 2.71828;
  radioTierra = 6378.1;
  distancia = 50;

  latitud: any;
  longitud: any;

  // leaflet
  private map?: Map;
  mapOptions = {
    layers: [
      tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${environment.leafletAccessToken}`, {
        tileSize: 512,
        zoomOffset: -1,
        minZoom: 0,
        maxZoom: 21,
        detectRetina: true,
        attribution: '© <a href="https://apps.mapbox.com/feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
      )
    ],
    zoom: 1,
    center: latLng(0, 0)
  };
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
    fecha: "",
    hourly: [{
      'wind_speed': 0,
      'wind_deg': 0
    }]
  };

  factoresCombinados = {
    rv: '',
    rvPercent: 100,
    rvi: '',
    rviPercent: 100
  };

  prediccionesPropagacion: any[] = [];
  velocidadPropagacion: any;

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

      }
      );
  }

  getLugar() {
    this.httpService.get(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=0&zoom=18&lat=${this.latitud}&lon=${this.longitud}`).then((data: any) => {
      this.lugar = data.display_name;
    });
  }


  //////////////////////////////////////   CLIMA      /////////////////////////////////////

  async getClima() {
    await this.httpService.get(`https://api.openweathermap.org/data/2.5/onecall?lat=${this.latitud}&lon=${this.longitud}&lang=es&exclude={minutely,daily,alerts}&appid=32a020e350d198b03a3acfbcdd355310`).then((data: any) => {

      // storing json data in variables
      this.clima.weatherlocation_lon = data.lon; // lon WGS84
      this.clima.weatherlocation_lat = data.lat; // lat WGS84
      this.clima.weatherstationname = data.name ? data.name : ''// Name of Weatherstation
      this.clima.weatherstationid = data.id ? data.id : '' // ID of Weatherstation
      this.clima.weathertime = data.current.dt // Time of weatherdata (UTC)
      this.clima.temperature = data.current.temp; // Kelvin
      this.clima.airpressure = data.current.pressure; // hPa
      this.clima.airhumidity = data.current.humidity; // %
      this.clima.temperature_min = data.current.temp_min ? data.current.temp_min : ''; // Kelvin
      this.clima.temperature_max = data.current.temp_max ? data.current.temp_max : ''; // Kelvin
      this.clima.windspeed = data.current.wind_speed; // Meter per second
      this.clima.DireccionViento = data.current.wind_deg; // Wind from direction x degree from north
      this.clima.cloudcoverage = data.current.clouds; // Cloudcoverage in %
      this.clima.weatherconditionid = data.current.weather[0].id // ID
      this.clima.weatherconditionstring = data.current.weather[0].main // Weatheartype
      this.clima.weatherconditiondescription = data.current.weather[0].description // Weatherdescription
      this.clima.weatherconditionicon = data.current.weather[0].icon // ID of weathericon

      this.clima.hourly = data.hourly;

      let DireccionViento = data.current.wind_deg;
      this.direccionViento = data.current.wind_deg;
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

    let topografia: any = await this.calcularTopografia(this.latitud, this.longitud);

    this.anguloInclinacion = topografia.anguloInclinacion;
    this.orientacionDeclive = topografia.orientacionDeclive;
    this.loadingTopoGrafia = false;

    this.calcularFactoresCombinados();

    this.calcularPrediccionPropagacion();

  }


  ////////////////////////////////////////////////////////////////////////////////////////////////////
  // Comunidades Aborígenes // 
  async hayComunidadAborigen(latitud: any, longitud: any) {

    await this.httpService.get(`${environment.urlSigMisiones}/datos/aborigenes.geojson`).then((data: any) => {
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

    return;
  };

  // Estacion de Servicio // 
  async hayEstacionServicio(latitud: any, longitud: any) {
    await this.httpService.get(`${environment.urlSigMisiones}/datos/combustible.geojson`).then((data: any) => {
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
    await this.httpService.get(`${environment.urlSigMisiones}/datos/deposito-gas.geojson`).then((data: any) => {
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
    await this.httpService.get(`${environment.urlSigMisiones}/datos/venta-gas.geojson`).then((data: any) => {
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
    await this.httpService.get(`${environment.urlSigMisiones}/datos/escuelas.geojson`).then((data: any) => {
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
    await this.httpService.get(`${environment.urlSigMisiones}/datos/aserraderos.geojson`).then((data: any) => {
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
    await this.httpService.get(`${environment.urlSigMisiones}/datos/estacion-transformadora.geojson`).then((data: any) => {
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
    await this.httpService.get(`${environment.urlSigMisiones}/datos/alta-tension.geojson`).then((data: any) => {
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
    await this.httpService.get(`${environment.urlOverpassApi}${queryParam}`).then((data: any) => {
      if (data.elements.length > 0) {
        if (data.elements[0].tags.boundary == "protected_area") {
          this.factorRiesgo = 5;
          let condicion = "Reserva Natural a menos de 2000m";
          let descripcion = data.elements[0].tags.name;
          this.condicionesRiesgo.push(condicion + '. : ' + descripcion);
        }
      }
    }, (error) => {
      console.error('hayReservaNatural', error);
    });
    return;
  }

  async hayAreaUrbanizada(latitud: any, longitud: any) {

    let queryParam = `relation(around:2000,${latitud},${longitud})[boundary=residential];out meta;`
    await this.httpService.get(`${environment.urlOverpassApi}${queryParam}`).then((data: any) => {
      if (data.elements.length > 0) {
        if (data.elements[0].tags.landuse == "residential") {
          this.factorRiesgo = 5;
          let condicion = "Zona urbanizada a menos de 500m";
          let descripcion = data.elements[0].tags.name
          this.condicionesRiesgo.push(condicion + '. : ' + descripcion);
        }
      }
    });

    return;
  }


  async analizarTipoSuelo(latitud: any, longitud: any) {
    let TipoSuelo = "";

    if (TipoSuelo == "") {
      let Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[natural=wood]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';
      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).then((result: any) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 4;
          let Condicion = "Foco de calor en un bosque natural";
          // Descripcion = "";
          TipoSuelo = "Bosque";
          this.velocidadPropagacion = 9;
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.usoDelSuelo.push(Condicion);
        }
      }, (error) => {
        console.error('tipo suelo bosque', error);
      });

    }


    // Plantacion Forestal
    if (TipoSuelo == "") {
      var Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[landuse=forest]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';
      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).then((result: any) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 4;
          let Condicion = "Foco de calor en una plantacion forestal";
          // Descripcion = ""
          TipoSuelo = "Plantación Forestal";
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.velocidadPropagacion = 31;
          this.usoDelSuelo.push(Condicion);
        }
      }, (error) => {
        console.error('tipo suelo Plantación Forestal', error);
      });

    }

    // Plantacion de Yerba o Té
    if (TipoSuelo == "") {
      var Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[landuse=orchard]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';
      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).then((result: any) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 3;
          let Condicion = "Foco de calor en un tierras de cultivo"
          // Descripcion = ""
          TipoSuelo = "Plantación agrícola";
          this.velocidadPropagacion = 58;
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.usoDelSuelo.push(Condicion);
        }
      }, (error) => {
        console.error('tipo suelo Plantación agrícola', error);
      });

    }

    // Pastizales
    if (TipoSuelo == "") {
      var Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[natural=grassland]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';
      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).then((result: any) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 4;
          let Condicion = "Foco de calor en un pastizal";
          // Descripcion = ""
          TipoSuelo = "Pastizal";
          this.velocidadPropagacion = 37;
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.usoDelSuelo.push(Condicion);
        }
      }, (error) => {
        console.error('tipo suelo Pastizal', error);
      });

    }

    // Matorrales
    if (TipoSuelo == "") {
      var Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[natural=scrub]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';

      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).then((result: any) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 2;
          let Condicion = "Foco de calor en un matorral o capuera";
          // Descripcion = ""
          TipoSuelo = "Matorral";
          this.velocidadPropagacion = 27;
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.usoDelSuelo.push(Condicion);
        }
      }, (error) => {
        console.error('tipo suelo Matorral', error);
      });

    }

    // Praderas. Pasturas
    if (TipoSuelo == "") {
      var Consulta = 'is_in(' + latitud + ',' + longitud + ')->.all_areas;' +
        'area.all_areas[landuse=meadow]->.forest;' +
        '(way(pivot.forest);>;node(area.forest);)' +
        ';out meta;';
      await this.httpService.get(`${environment.urlOverpassApi}${Consulta}`).then((result: any) => {
        if (result.elements.length > 0) {
          this.factorRiesgo = 1;
          let Condicion = "Foco de calor en una pradera o pastoreo";
          // Descripcion = ""
          TipoSuelo = "Pradera. Pastoreo";
          // CondicionesRiesgo.push(Condicion + '. : ' + Descripcion);
          this.usoDelSuelo.push(Condicion);
          this.velocidadPropagacion = 25;
        }
      }, (error) => {
        console.error('tipo suelo Pradera. Pastoreo', error);
      });

    }

    return;
  }

  async calcularTopografia(latitud: any, longitud: any) {
    ////////////////////////////////// TOPOGRAFIA //////////////////////////////


    // Coordenadas del Foco de Incendio


    ///////////////////////////////////////////////////////////////
    //  Inclinacion
    ///////////////////////////////////////////////////////////////


    let Recorrido = 0;
    let Angulo = 0;
    let Distancia = 50; // Diametro de 100 m
    //let Coordenadas = '';
    let CoefRadianes = Math.PI / 180;
    let CoefGrados = 180 / Math.PI;

    //let Coordenadas = LatitudInicio.toFixed(5) + ',' + LongitudInicio.toFixed(5) + '|';	
    let Coordenadas = latitud + ',' + longitud + '|';

    for (let iteracion = 0; iteracion < 8; iteracion++) {   // Se calculan 8 puntos sobre un circulo de 50 metros

      //var LatIni = LatitudInicio.toFixed(5) * CoefRadianes;
      //var LonIni = LongitudInicio.toFixed(5) * CoefRadianes;
      let LatIni = latitud * CoefRadianes;
      let LonIni = longitud * CoefRadianes;
      let AngRad = Angulo * CoefRadianes;
      let R = this.radioTierra;
      let d = Distancia / 1000;

      // https://izziswift.com/get-lat-long-given-current-point-distance-and-bearing/
      let LatFin = Math.asin(Math.sin(LatIni) * Math.cos(d / R) + Math.cos(LatIni) * Math.sin(d / R) * Math.cos(AngRad));
      let LonFin = LonIni + Math.atan2(Math.sin(AngRad) * Math.sin(d / R) * Math.cos(LatIni), Math.cos(d / R) - Math.sin(LatIni) * Math.sin(LatFin));
      let LatitudFin = LatFin * 180 / Math.PI;
      let LongitudFin = LonFin * 180 / Math.PI;


      Coordenadas = Coordenadas + LatitudFin + ',' + LongitudFin + '|';
      Angulo = Angulo + 45;

    }

    let OrientacionDeclive: any;
    let AnguloInclinacion: any;

    // Lectura de los 8 puntos circundantes las coordenadas de origen 
    await this.httpService.get(`https://api.opentopodata.org/v1/srtm30m?locations=${Coordenadas}`).then((datos: any) => {
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
      AnguloInclinacion = parseFloat((Math.atan(DiferenciaAltura / dist) * 100).toFixed(2));
      if ((AnguloInclinacion >= 35)) { this.factorRiesgo = 4; };
      // CondicionesRiesgo.push("Inclinacion: " + AnguloInclinacion + "º");
      // this.anguloInclinacion = AnguloInclinacion;


      ///////////////////////////////////
      // Orientacion
      ///////////////////////////////////

      let y = Math.sin((LonFin - LonIni) * CoefRadianes) * Math.cos(LatFin * CoefRadianes);
      let x = Math.cos(LatIni * CoefRadianes) * Math.sin(LatFin * CoefRadianes) - Math.sin(LatIni * CoefRadianes) * Math.cos(LatFin * CoefRadianes) * Math.cos((LonFin - LonIni) * CoefRadianes);
      OrientacionDeclive = parseFloat((((Math.atan2(y, x) * CoefGrados) + 360) % 360).toFixed(2));

      // CondicionesRiesgo.push("Orientacion Declive:  " + OrientacionDeclive + "º");
      // this.orientacionDeclive = OrientacionDeclive;


      /////// }); // 	$.getJSON("https://api.opentopodatos.org	




      // LA TOPOGRAFIA FINALIZA AQUI ////  
    });

    return {
      'orientacionDeclive': OrientacionDeclive,
      'anguloInclinacion': AnguloInclinacion
    }
  }

  calcularFactoresCombinados() {
    ////////////////////////////////////////////////////
    // Calculo del factor Viento/Rumbo/Inclinacion (VRI)
    ////////////////////////////////////////////////////
    // Mide la relación entre la orientación y angulo del declive del terreno con la dirección del viento
    // 1 si ambos tienen la misma dirección
    // 0 si tienen direcciones enfrentadas en 180º

    // TODO corregir el viento {direccionViento}

    // Calculo del coeficiente Rumbo/Viento  cos(declive) / cos(viento)
    // Resultados: 0 -- 1
    let RV = (Math.abs(Math.cos((this.orientacionDeclive * this.coeficienteRadianes)) + Math.cos((this.direccionViento * this.coeficienteRadianes))) / 2).toFixed(2);
    // const e = 2.718281828459045;
    // RVI = ((e ^ x)-1) ^ 2
    // Resultados: 0 --15

    let RVI = ((((this.e ^ (this.anguloInclinacion * this.coeficienteRadianes)) - 1) ^ 2) * Number(RV)).toFixed(2);

    // CondicionesRiesgo.push('<br><b>Factores Combinados de Topografía y Clima</b>');

    // CondicionesRiesgo.push("Factor RV (Rumbo de la Inclinación/Dirección del Viento):  " + RV + " // Valores: 0=Bajo - 1=Alto");
    // CondicionesRiesgo.push("Factor RVI (Rumbo/Inclinacion/Dirección del Viento): " + RVI + "  Valores: 0 - 15");

    this.factoresCombinados.rv = RV;
    this.factoresCombinados.rvPercent = (parseFloat(RV) * 100) / 1
    this.factoresCombinados.rvi = RVI;
    this.factoresCombinados.rviPercent = (parseFloat(RVI) * 100) / 15

    this.loadingFactoresCombinados = false;
  }

  onMapReady(map: Map) {
    console.log('map redi')
    this.map = map;
    this.map.setZoom(14);
    this.map.panTo(latLng(this.latitud, this.longitud));
    // this.map.addLayer(circle([this.latitud, this.longitud], 100, { color: 'yellow', opacity: 1, fillColor: 'red', fillOpacity: .4 }));

  }

  calcularPrediccionPropagacion() {

    // let diametro = 100
    // let velocidad = 0.2 // Velocidad del Viento
    // let direccion = 14

    // let radioTierra = 6378.1;
    // let coefRadianes = Math.PI / 180;
    // let recorrido = 0;

    // let currentLat = this.latitud;
    // let currentLong = this.longitud;
    // // Calculo las posiciones del centro del circulo de afectación
    // for (let iteracion = 0; iteracion < 6; iteracion++) {
    //   let velocidadViento = velocidad // m/s convertido a Km/h
    //   let DireccionViento = direccion;

    //   let Angulo = DireccionViento;
    //   let distancia = velocidadViento;    // Esto determina la posicion del siguiente punto
    //   recorrido = recorrido + distancia;


    //   // Dibuja los circulos en el mapa
    //   // let circle = L.circle([this.latitud, this.longitud], diametro, {
    //   //   color: 'red',
    //   //   fillColor: '#f03',
    //   //   fillOpacity: 0.5
    //   // }).addTo(map);
    //   // circle.bindPopup('Hora: ' + iteracion + '<br>Distancia: ' + recorrido + " km.");

    //   let mapCircle = circle([currentLat, currentLong], diametro, {
    //     color: 'red',
    //     fillColor: '#f03',
    //     fillOpacity: 0.5
    //   });
    //   mapCircle.bindPopup('Hora: ' + iteracion + '<br>Distancia: ' + recorrido + " km.");

    //   this.map?.addLayer(mapCircle);

    //   let lat1 = currentLat * coefRadianes;
    //   let lon1 = currentLong * coefRadianes;
    //   let brng = Angulo * coefRadianes;
    //   let R = radioTierra;
    //   let d = distancia;

    //   let lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) + Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng));
    //   let lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1), Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));
    //   let LatitudFin = lat2 * 180 / Math.PI;
    //   let LongitudFin = lon2 * 180 / Math.PI;


    //   let hora = iteracion == 0 ? 'Actual' : `+${iteracion} h`;
    //   this.prediccionesPropagacion.push({
    //     'hora': hora,
    //     'latLang': `${parseFloat(currentLat).toFixed(5)}, ${parseFloat(currentLong).toFixed(5)}`
    //   });

    //   currentLat = LatitudFin;
    //   currentLong = LongitudFin;
    // }

    //////////////////////   PREVISION DEL DESPLAZAMIENTO PARA LAS PROXIMAS 5 HORAS /////////////////

    // var DireccionViento = data.current.wind.deg
    // var VelocidadViento = current.windspeedkmh 
    // VelocidadPropagacion se define en la función AnalizarTipoDeSuelo(Latitud, Longitud)

    let RV = (Math.abs(Math.cos((this.orientacionDeclive * this.coeficienteRadianes)) + Math.cos((this.direccionViento * this.coeficienteRadianes))) / 2);
    let RVI = ((((this.e ^ (this.anguloInclinacion * this.coeficienteRadianes)) - 1) ^ 2) * RV);

    let currentLat = this.latitud;
    let currentLong = this.longitud;
    let diametro = 100;

    for (let iteracion = 0; iteracion < 6; iteracion++) {

      let velocidadViento = this.clima.hourly[iteracion].wind_speed;
      let direccionViento = this.clima.hourly[iteracion].wind_deg;

      // coeficinte hora del dia
      let x = new Date().getHours() + iteracion;
      
      let dft = Math.pow(this.e, - (Math.pow((1.8 - x / 8), 2)));

      let recorrido = this.velocidadPropagacion * RVI * (velocidadViento * 0.1) * dft;

      let Angulo = direccionViento;

      let lat1 = currentLat * this.coeficienteRadianes;
      let lon1 = currentLong * this.coeficienteRadianes;
      let brng = Angulo * this.coeficienteRadianes;
      let R = this.radioTierra;
      let d = this.distancia;

      let lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) + Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng));
      let lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1), Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));
      let LatitudFin = lat2 * 180 / Math.PI;
      let LongitudFin = lon2 * 180 / Math.PI;   // Nueva Posicion para la siguiente hora

      // let LatitudInicio = LatitudFin;
      // let LongitudInicio = LongitudFin;
      // Mostrar las nuevas coordenadas en la tabla de predicción y
      // Dibujar los circulos en el mapa


      // Dibuja los circulos en el mapa
      // let circle = L.circle([this.latitud, this.longitud], diametro, {
      //   color: 'red',
      //   fillColor: '#f03',
      //   fillOpacity: 0.5
      // }).addTo(map);
      // circle.bindPopup('Hora: ' + iteracion + '<br>Distancia: ' + recorrido + " km.");

      let mapCircle = circle([currentLat, currentLong], diametro, {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5
      });
      mapCircle.bindPopup('Hora: ' + iteracion + '<br>Distancia: ' + recorrido + " km.");

      this.map?.addLayer(mapCircle);


      // Llamar a la función Topografía y obtener los nuevos valores de: 
      // AnguloInclinacion 
      // OrientacionDeclive

      // Cambiar los valores del clima para la siguiente hora
      // let DireccionViento = data.current.wind.deg[hora];
      // let VelocidadViento = current.windspeedkmh[hora];

      let hora = iteracion == 0 ? 'Actual' : `+${iteracion} h`;
      this.prediccionesPropagacion.push({
        'hora': hora,
        'latLang': `${parseFloat(currentLat).toFixed(5)}, ${parseFloat(currentLong).toFixed(5)}`
      });

      currentLat = LatitudFin;
      currentLong = LongitudFin;

    }

    this.loadingPrediccionPropagacion = false;
  }


}
