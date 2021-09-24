var path = require("path");
const { documentExtract } = require("../utils.js");

const readPaymentgSupport = (filePath, isRequest = false) =>
  new Promise((resolve, reject) => {
    try {
      let ext = path.extname(filePath);

      let arrayTextLine = [];

      /**
       * Json de resultado
       */
      let resultArray = [];

      /**
       * Left de devengos
       */
      let leftEarns = 0;

      /**
       * Left de descuentos
       */
      let leftDiscounts = 0;

      let contConfidence = 0;
      let totalDatos = 0;

      let jsonClient = {
        name: "",
        banco: {
          name: "",
          account: "",
        },
        cargo: "NO REGISTRA",
        salud: "NO REGISTRA",
        basico: "",
        nomina: "",
        pension: "NO REGISTRA",
        convenio: "",
        // fechaIngreso: "",
        devengos: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        confidence: null,
        sueldoNeto: null,
        descuentos: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        documentNumber: "",
      };

      let jsonCompany = {
        nit: "",
        name: "",
      };

      if (ext === ".png" || ext === ".jpeg" || ext === ".jpg") {
        (async () => {
          let jsonToRead = await documentExtract(filePath, isRequest);

          if (jsonToRead != "error") {
            /**
             * sacamos todas las lineas leidas
             */

            for (const block of jsonToRead.Blocks) {
              if (block.BlockType === "LINE") {
                let strTop =
                  block.Geometry.BoundingBox.Top.toString().substring(0, 6);

                // console.log(block);

                let pos = -1;
                for (let index = 0; index < arrayTextLine.length; index++) {
                  const element = arrayTextLine[index];
                  if (Math.abs(element.top - parseFloat(strTop)) < 0.005) {
                    pos = index;
                    break;
                  }
                }
                if (pos !== -1) {
                  arrayTextLine[pos].arrayText.push({
                    // top: strTop,
                    text: block.Text,
                    left: block.Geometry.BoundingBox.Left.toFixed(2),
                    confidence: block.Confidence,
                  });
                } else {
                  let newElem = {};
                  newElem.top = parseFloat(strTop);
                  newElem.arrayText = [
                    {
                      // top: ":::" + strTop,
                      text: block.Text,
                      left: block.Geometry.BoundingBox.Left.toFixed(2),
                      confidence: block.Confidence,
                    },
                  ];
                  arrayTextLine.push(newElem);
                }

                // Captura de valores left devengos
                if (
                  block.Text.toUpperCase().startsWith(
                    "CONCEP DESCRIPCION CONCEPTO"
                  )
                ) {
                  leftEarns = block.Geometry.BoundingBox.Left.toFixed(2);
                }

                // Captura de valores left descuentos
                if (block.Text.toUpperCase().startsWith("CENTRO COSTO")) {
                  leftDiscounts = block.Geometry.BoundingBox.Left.toFixed(2);
                }

                // #################################################### fin if
              }
            }
            // ################################################## fin for
          }

          /**
           * Posición inicial de tabla de dev/ded
           */
          let init = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf("CONCEP DESCRIPCION CONCEPTO");

          // console.log(init);

          /**
           * Posición final de tabla de dev/ded y campo
           * de subtotales devengos y deducciones
           */
          let end =
            arrayTextLine
              .map((e) => {
                return e.arrayText[0].text;
              })
              .indexOf("Firma:") - 3;

          // console.log(end);

          // GUARDANDO REFERENCIAS DE SUBTOTALES Y LEFTS DE DEVENGOS Y DEDUCCIONES

          /**
           * Referencia del bloque donde se encuentran los subtotales
           */
          let bloque = 0;
          // Subtotal de devengos y descuentos(deducciones)
          if (arrayTextLine[end].arrayText[0]?.text.includes("NETO")) {
            bloque = end - 1;

            // EL BLOQUE TIENE NETO

            // leftEarns = arrayTextLine[bloque].arrayText[0]?.left;
            // leftDiscounts = arrayTextLine[bloque].arrayText[1]?.left;

            jsonClient.devengos.subtotal =
              arrayTextLine[bloque].arrayText[0]?.text.split("$ ")[1];
            jsonClient.descuentos.subtotal =
              arrayTextLine[bloque].arrayText[1]?.text.split("$ ")[1];
          } else {
            // EL BLOQUE TIENE LA REFERENCIA DE SUBTOTALES

            // leftEarns = arrayTextLine[end].arrayText[0]?.left;
            // leftDiscounts = arrayTextLine[end].arrayText[1]?.left;

            jsonClient.devengos.subtotal =
              arrayTextLine[end].arrayText[0]?.text.split("$ ")[1];
            jsonClient.descuentos.subtotal =
              arrayTextLine[end].arrayText[1]?.text.split("$ ")[1];
          }

          /**
           * Recorrido del documento para capturar datos fijos donde se
           * declaran 2 variables
           * @bloque que por defecto el valor del dato esta siempre 1 campo
           * debajo del header
           * @columna para ubicar respectivamente el dato por bloque, teniendo
           * en cuenta que cada bloque tiene distintas columnas. Además de que
           * 0 -> Es la primera ya que se devuelve como un Array
           */

          // NOTA: LOS TEXTOS QUE NO TIENEN COHERENCIA EN LAS
          // VALIDACIONES SON CASOS ESPECIFICOS DE DOCUMENTOS
          // QUE NO SON BIEN LEIDOS
          // guardar solo numeros .replace(/\D/g, "")
          // guardar solo texto .replace(/[0-9]+/g, "")

          /**
           * sacamos todas las lineas leidas
           */
          for (let i = 0; i < arrayTextLine.length; i++) {
            let block = i + 1;
            let columna = 0;

            arrayTextLine[i].arrayText.map((x) => {
              // GUARDANDO CONVENIO ###################### ----------------------------------
              if (x.text.startsWith("CENTRO DE UTILIDAD")) {
                let codigoDividido = "";

                // Si el bloque de abajo empieza con el codigo 0 viene el nombre del convenio
                if (
                  arrayTextLine[block].arrayText[columna]?.text.startsWith(
                    "0"
                  ) ||
                  arrayTextLine[block].arrayText[columna]?.text.startsWith("1")
                ) {
                  codigoDividido =
                    arrayTextLine[block].arrayText[columna]?.text.split(" ");
                } else {
                  // El bloque de abajo viene con otro texto o marca de agua
                  codigoDividido =
                    arrayTextLine[block + 1].arrayText[columna]?.text.split(
                      " "
                    );
                }

                let textConvenioSeparado = codigoDividido.slice(2);
                let textConvenio = textConvenioSeparado.join(" ");

                jsonClient.convenio = textConvenio;
              }

              // GUARDANDO NOMBRE, CEDULA, SALARIO BASE (DEPENDIENDO DE)
              // LA LINEA ###################### ----------------------------------
              if (x.text.includes("NOMBRE")) {
                // Guardando Salario base dependiendo de la linea
                let textOtroBloque = arrayTextLine[i + 4].arrayText[0]?.text;
                if (textOtroBloque.includes("$")) {
                  // Sueldo en la misma linea
                  let obtenerSueldo = textOtroBloque.split("$ ")[1];
                  let sueldo = obtenerSueldo.split(" ")[0];
                  jsonClient.basico = sueldo;
                } else {
                  // Guardando sueldo base
                  jsonClient.basico = x.text.split("$ ")[1];
                }

                // Guardando numero de cedula
                let textInicioDocumento = x.text.split("(")[1];
                let numDocumento = textInicioDocumento.split(")")[0];
                jsonClient.documentNumber = numDocumento;

                // Guardando nombre del cliente
                let nameSeparado = x.text.split(": ")[2];
                let name = nameSeparado.split(" (")[0];
                jsonClient.name = name;
              }

              // GUARDANDO SUELDO NETO ###################### ----------------------------------
              if (x.text.includes("NETO: ")) {
                jsonClient.sueldoNeto = x.text.split("$ ")[1];
              }

              // GUARDANDO NUMERO DE CUENTA BANCARIA Y NOMBRE
              // ###################### ----------------------------------
              if (x.text.toUpperCase().startsWith("MODO PAGO:")) {
                if (x.text.includes("<Ninguno>")) {
                  jsonClient.banco.account = "NO REGISTRA";
                  jsonClient.banco.name = "NO REGISTRA";
                } else {
                  jsonClient.banco.account = arrayTextLine[i].arrayText[
                    columna
                  ].text.replace(/\D/g, "");

                  let separarCad = x.text.split(" ");
                  let ubicacionBanco = separarCad.indexOf("BANCO");
                  let name = separarCad.slice(ubicacionBanco);
                  jsonClient.banco.name = name.join(" ");
                }
              }

              // GUARDANDO FECHA DE NOMINA ###################### -------------------------------
              if (x.text.includes("PERIODO:")) {
                let lengthCadena = x.text.split(" ").length;
                let capturaFecha = "";
                // Codigo periodo pegado a la primera fecha
                if (lengthCadena === 4) {
                  capturaFecha = x.text.split(" ")[3];
                } else {
                  // Codigo periodo despegado a la primera fecha
                  capturaFecha = x.text.split(" ")[4];
                }
                let dividirFecha = capturaFecha.split("(")[1];
                let fecha = dividirFecha.split(")")[0];
                jsonClient.nomina = fecha;
              }

              // GUARDANDO NOMBRE DE EMPRESA Y NIT ###################### ------------------
              if (x.text.toUpperCase().includes("EMPRESA:")) {
                // Datos del nit
                let dividirNit = "";
                let nit = "";

                // Datos de la empresa
                let dividirEmpresa = x.text.split(": ")[1];
                let name = dividirEmpresa.split("(")[0];

                // Si el nombre de la empresa no captura numeros
                if (isNaN(parseInt(x.text.replace(/\D/g, "")))) {
                  // SOLO VIENE TEXTO
                  jsonCompany.name = name;

                  // se guarda el nit del bloque i + 4 (Caso especial)
                  // Y si viene el sueldo base junto con el
                  let textOtroBloque = arrayTextLine[i + 4].arrayText[0]?.text;
                  if (textOtroBloque.includes("(")) {
                    dividirNit = textOtroBloque.split("(")[1];
                    nit = dividirNit.split(")")[0];
                    jsonCompany.nit = nit;
                  }
                } else {
                  // NOMBRE DE EMPRESA Y NIT EN LA MISMA LINEA
                  jsonCompany.name = name;

                  dividirNit = x.text.split("(")[1];
                  nit = dividirNit.split(")")[0];

                  // Si el nit incluye un guión
                  if (x.text.includes("-")) {
                    jsonCompany.nit = nit;
                  } else {
                    jsonCompany.nit = x.text.replace(/\D/g, "");
                  }
                }
              }

              // Calculo de puntuacion de confiabilidad de lectura del documento
              contConfidence += x.confidence;
              totalDatos++;
              jsonClient.confidence = (contConfidence / totalDatos).toFixed(2);
            });
          }

          /**
           * Objeto que guarda los elementos que tengan devengos
           */
          let elementDevengos = {};

          /**
           * Objeto que guarda los elementos que tengan descuentos
           */
          let elementDescuentos = {};

          // Recorriendo la tabla

          /**
           * Recorrido unico de la tabla, que guarda dependiendo si es un
           * devengo o un descuento los valores en los Objetos @elementDevengos
           * o @elementDescuentos respectivamente los datos de la columna
           *
           * Estos se validan dependiendo de la coordenada left si hay un dato
           * vacio se guarda como 0 y si hay un dato que no corresponde a la respectiva
           * columna se corre a la columna perteneciente
           *
           * Siendo asi 4 columnas para devengos y 4 columnas para deducciones
           *                                  Devengos
           * arrayTextLine[i].arrayText[0] -> Columna Concepto
           * arrayTextLine[i].arrayText[1] -> Columna Descripcion
           * arrayTextLine[i].arrayText[2] -> Columna Cantidad
           * arrayTextLine[i].arrayText[3] -> Columna Devengos
           *
           *                                  Deducciones
           * arrayTextLine[i].arrayText[4] -> Columna Centro costo
           * arrayTextLine[i].arrayText[5] -> Columna Concepto
           * arrayTextLine[i].arrayText[6] -> Columna Descripcion
           * arrayTextLine[i].arrayText[7] -> Columna Descuento
           */

          //TODO: LECTURA DE DEVENGOS Y DEDUCCIONES
          for (let i = init + 1; i < end; i++) {
            // Valores de columnas devengo
            let concepDevengo = "";
            let descripcionDevengo = "";
            let cantidadDevengo = "";
            let devengo = "";

            // Valores de columnas deducciones
            let centroCosto = "";
            let concepDeduccion = "";
            let descripcionDeduccion = "";
            let deduccion = "";

            // console.log(arrayTextLine[i].arrayText[2]);

            arrayTextLine[i].arrayText.map((x) => {
              // List Devengos
              if (x.left >= leftEarns && x.left < leftDiscounts) {
                console.log(x);
                /**
                 * Variable condicional, si el valor de devengos viene en la
                 * posicion de la columna cantidad
                 */
                let comprobarDevengoEnCantidad = arrayTextLine[
                  i
                ].arrayText[2]?.text.includes("$ ")
                  ? 0
                  : arrayTextLine[i].arrayText[2]?.text;

                // Columna Concepto
                if (arrayTextLine[i].arrayText[0]?.left >= x.left) {
                  concepDevengo = x.text;
                }

                // Columna Descripcion concepto
                if (arrayTextLine[i].arrayText[1]?.left >= x.left) {
                  descripcionDevengo = x.text;
                }

                // Columna Cantidad
                if (arrayTextLine[i].arrayText[2]?.left === x.left) {
                  cantidadDevengo = x.text;
                }

                // Columna devengos
                if (arrayTextLine[i].arrayText[2]?.left <= x.left) {
                  devengo = x.text;
                } else {
                  devengo = 0;
                }

                elementDevengos = {
                  concepDevengo,
                  descripcionDevengo,
                  cantidadDevengo:
                    cantidadDevengo === "" ? 0 : comprobarDevengoEnCantidad,
                  devengo,
                };

                contConfidence += x.confidence;
                totalDatos++;
                jsonClient.devengos.confidence = (
                  contConfidence / totalDatos
                ).toFixed(2);
              }

              // List deducciones
              if (x.left >= leftDiscounts) {
                contConfidence += x.confidence;
                totalDatos++;
                jsonClient.descuentos.confidence = (
                  contConfidence / totalDatos
                ).toFixed(2);
              }
            });

            jsonClient.devengos.list.push(elementDevengos);
            //TODO: // jsonClient.descuentos.list.push(elementDescuentos);
          }

          // MUESTREO TEMPORAL
          console.log(jsonClient.devengos);
          // console.log(jsonClient.descuentos);

          // AÑADIENDO LOS RESULTADOS DE LOS OBJETOS AL ARRAY
          resultArray.push(jsonClient);
          resultArray.push(jsonCompany);

          // arrayTextLine.map((x) => console.log(x));
          jsonToRead ? resolve(resultArray) : resolve(false);
        })();
      }
    } catch (error) {
      console.log("ERROR");
      console.log(error);
      resolve(false);
    }
  });

module.exports = { readPaymentgSupport };
