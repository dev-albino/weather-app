$(function () {

    // var APIKey_accuweather = "BFhFUKruGUjvdIw9r83mDLtd62fw8t2E";
    // var tokenMapbox = "pk.eyJ1IjoiZGV2emVybyIsImEiOiJjbDVpdGMyaHIwMTYzM2NuMWY4cHN2cnYwIn0.KWevORMcL9Ndh9IjQ_xalw";
    var objectWeather = {
        cidade: "",
        estado: "",
        pais: "",
        temperatura: "",
        texto: "",
        icone: "",
    };

    function WeatherFilter(cidade, estado, pais, temperatura, texto, icone) {
        $("#texto_local").text(`${cidade}, ${estado}. ${pais}`);
        $("#texto_temperatura").html(`${temperatura}&deg;`);
        $("#texto_clima").text(texto);
        $("#icone_clima").css("background-image", `url("${icone}")`);
    };

    function hourChart(horas, temperaturas){
        Highcharts.chart('hourly_chart', {
            chart: {
                type: 'spline'
            },
            title: {
                text: 'Temperatura Hora a Hora'
            },
            xAxis: {
                categories: horas,
                accessibility: {
                    description: 'Months of the year'
                }
            },
            yAxis: {
                title: {
                    text: 'Temperatura ºC'
                },
                labels: {
                    formatter: function () {
                        return this.value + '°';
                    }
                }
            },
            tooltip: {
                crosshairs: true,
                shared: true
            },
            plotOptions: {
                spline: {
                    marker: {
                        radius: 4,
                        lineColor: '#666666',
                        lineWidth: 1
                    },
                    dataLabels: {
                        enabled: false
                    },
                    enableMouseTracking: true
                }
            },
            series: [{
                name: "Temperatura",
                showInLegend: false,
                marker: {
                    symbol: 'diamonds'
                },
                data: temperaturas
            }]
        });

        $(".highcharts-label").hide();
        $(".highcharts-credits").hide();
        $(".highcharts-data-label").css("padding-bottom", "2px");
    };

    function timeForecast(localCode){
        $.ajax({
            url: "http://dataservice.accuweather.com/forecasts/v1/hourly/12hour/" + localCode + "?apikey=" + APIKey_accuweather + "&language=pt-br&metric=true",
            type: "GET",
            dataType: "json"
        }).done((data) => {
            var horas = [];
            var temperaturas = [];

            for (let dados of data) {
                var date = new Date(dados.DateTime);
                var format = date.getHours() < 10 ? "0" + String(date.getHours()) : String(date.getHours());
                horas.push(format + "h");
                temperaturas.push(dados.Temperature.Value);
                hourChart(horas, temperaturas);
            }
            $(".refresh-loader").fadeOut();
        }).fail(() => {
            alertError("Erro ao renderizar o gráfico");
        });
    };

    function fiveDaysWeather(index) {
        $("#info_5dias").html("");
        var arrayDias = ["Domingo", "Segunda-feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];

        for (let dias of index) {
            var date = new Date(dias.Date);
            var weatherIcon = dias.Day.Icon < 10 ? "0" + String(dias.Day.Icon) : String(dias.Day.Icon);
            $("#info_5dias").append(`
                <div class="day col">
                    <div class="day_inner">
                        <div class="dayname">${arrayDias[date.getDay()]}</div>
                        <div style="background-image: url('https://developer.accuweather.com/sites/default/files/${weatherIcon}-s.png')" class="daily_weather_icon"></div>
                        <div class="max_min_temp">${String(dias.Temperature.Minimum.Value)}&deg; / ${String(dias.Temperature.Maximum.Value)}&deg;</div>
                    </div>
                </div>
            `);
        };
    };

    function extremeTemperatures(localCode) {
        $.ajax({
            url: "http://dataservice.accuweather.com/forecasts/v1/daily/5day/" + localCode + "?apikey=" + APIKey_accuweather + "&language=pt-br&metric=true",
            type: "GET",
            dataType: "json"
        }).done((data) => {
            $("#texto_max_min").html(`${data.DailyForecasts[0].Temperature.Minimum.Value}&deg; / ${data.DailyForecasts[0].Temperature.Maximum.Value}&deg;`)
            fiveDaysWeather(data.DailyForecasts);
        }).fail(() => {
            alertError("Erro ao consultar as temperaturas");
        });
    };

    function currentTime(localCode) {
        $.ajax({
            url: "http://dataservice.accuweather.com/currentconditions/v1/" + localCode + "?apikey=" + APIKey_accuweather + "&language=pt-br",
            type: "GET",
            dataType: "json"
        }).done((data) => {
            try {
                objectWeather.temperatura = data[0].Temperature.Metric.Value;
                objectWeather.texto = data[0].WeatherText;

                var weatherIcon = data[0].WeatherIcon < 10 ? "0" + String(data[0].WeatherIcon) : String(data[0].WeatherIcon);
                objectWeather.icone = `https://developer.accuweather.com/sites/default/files/${weatherIcon}-s.png`

                WeatherFilter(objectWeather.cidade,
                    objectWeather.estado,
                    objectWeather.pais,
                    objectWeather.temperatura,
                    objectWeather.texto,
                    objectWeather.icone);
            } catch {
                alertError("Erro ao renderizar os dados na tela");
            }
        }).fail(() => {
            alertError("Erro ao renderizar os dados na tela");
        });
    };

    function userLocation(latitude, longitude){
        $.ajax({
            url: "http://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=" + APIKey_accuweather + "&q=" + latitude + "%2C" + longitude + "&language=pt-br",
            type: "GET",
            dataType: "json"
        }).done((data) => {
            try {
                objectWeather.cidade = data.ParentCity.LocalizedName;
                objectWeather.estado = data.AdministrativeArea.LocalizedName;
                objectWeather.pais = data.Country.LocalizedName;
            } catch {
                objectWeather.cidade = data.LocalizedName;
                objectWeather.estado = data.AdministrativeArea.LocalizedName;
                objectWeather.pais = data.Country.LocalizedName;
            }
            currentTime(data.Key);
            extremeTemperatures(data.Key);
            timeForecast(data.Key);
        }).fail(() => {
            alertError("Erro ao obter as coordenadas da cidade");
        });
    };

    function inputSearch(input) {
        $.ajax({
            url: "https://api.mapbox.com/geocoding/v5/mapbox.places/" + encodeURI(input) + ".json?access_token=" + tokenMapbox,
            type: "GET",
            dataType: "json"
        }).done((data) => {
            try {
                var longitude = data.features[0].geometry.coordinates[0];
                var latitude = data.features[0].geometry.coordinates[1];
                userLocation(latitude, longitude);
            } catch {
                alertError("Erro ao renderizar os dados na tela");
            }
        }).fail(() => {
            alertError("Erro ao localizar a cidade");
        });
    };

    (function defaultAddress() {
        var defaultLatitude = -22.969279108014405,
            defaultLongitude = -43.18738624128574;

        $.ajax({
            url: "http://www.geoplugin.net/json.gp",
            type: "GET",
            dataType: "json"
        }).done((data) => {
            if (data.geoplugin_latitude && data.geoplugin_longitude) {
                userLocation(data.geoplugin_latitude, data.geoplugin_longitude);
            } else {
                userLocation(defaultLatitude, defaultLongitude);
            }
        }).fail(() => {
            userLocation(defaultLatitude, defaultLongitude);
        });
    })();

    function alertError(mensagem){
        if(!mensagem){
            mensagem = "Erro na Solicitação";
        }
        $("#aviso-erro").text(mensagem);
        $("#aviso-erro").slideDown();
        $(".refresh-loader").fadeOut();
        window.setTimeout(() => {
            $("#aviso-erro").slideUp();
        }, 3500);
    };

    $("#search-button").click(function(){
        $(".refresh-loader").show();
        if ($("#local").val()) {
            inputSearch($("#local").val());
        } else {
            alert("Local não encontrado!");
        }
    });

    $("#local").on("keypress", function(e){
        if (e.which == 13) {
            $(".refresh-loader").show();
            if ($("#local").val()) {
                inputSearch($("#local").val());
            } else {
                alert("Local não encontrado!");
            };
        };
    });
});