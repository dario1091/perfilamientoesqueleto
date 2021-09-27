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

      /**
       * Datos para calcular confidence
       */
      let contConfidence = 0;
      let totalDatos = 0;

      let jsonClient = {
        client: {
          name: "",
          banco: {
            name: "",
            account: "",
          },
          cargo: "",
          salud: "",
          basico: "",
          nomina: "",
          pension: "",
          convenio: "",
          fechaIngreso: "",
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
        },
      };

      let jsonCompany = {
        company: {
          nit: "",
          name: "",
        },
      };

      if (ext === ".png" || ext === ".jpeg" || ext === ".jpg") {
        (async () => {
          let jsonToRead = await documentExtract(filePath, isRequest);

          if (jsonToRead != "error") {
            let cantidadDatos = 0;
            let unicaHoja = false;

            jsonToRead.Blocks.map((x) => {
              if (x.BlockType === "LINE") {
                cantidadDatos++;
              }
            });

            if (cantidadDatos < 110) {
              unicaHoja = true;
            }
            // Si el documento viene en formato de dos hojas
            if (unicaHoja) {
              // console.log("Es unica hoja");
              for (const block of jsonToRead.Blocks) {
                if (block.BlockType === "LINE") {
                  let strTop =
                    block.Geometry.BoundingBox.Top.toString().substring(0, 6);

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
                      text: block.Text,
                      left: block.Geometry.BoundingBox.Left.toFixed(2),
                      confidence: block.Confidence,
                    });
                  } else {
                    let newElem = {};
                    newElem.top = parseFloat(strTop);
                    newElem.arrayText = [
                      {
                        text: block.Text,
                        left: block.Geometry.BoundingBox.Left.toFixed(2),
                        confidence: block.Confidence,
                      },
                    ];
                    arrayTextLine.push(newElem);
                  }

                  // Captura de valores left devengos
                  if (block.Text.toUpperCase().startsWith("DEVENGOS")) {
                    leftEarns = block.Geometry.BoundingBox.Left.toFixed(2);
                  }

                  // Captura de valores left descuentos
                  if (block.Text.toUpperCase().startsWith("DESCUENTOS")) {
                    leftDiscounts = block.Geometry.BoundingBox.Left.toFixed(2);
                  }

                  // #################################################### fin if
                }
              }
              // ################################################## fin for
            } else {
              // console.log("Formato divido");
              for (const block of jsonToRead.Blocks) {
                if (
                  block.BlockType === "LINE" &&
                  block.Geometry.BoundingBox.Left < 0.5
                ) {
                  // console.log(block);
                  let strTop =
                    block.Geometry.BoundingBox.Top.toString().substring(0, 6);

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
                      text: block.Text,
                      left: block.Geometry.BoundingBox.Left.toFixed(2),
                      confidence: block.Confidence,
                    });
                  } else {
                    let newElem = {};
                    newElem.top = parseFloat(strTop);
                    newElem.arrayText = [
                      {
                        text: block.Text,
                        left: block.Geometry.BoundingBox.Left.toFixed(2),
                        confidence: block.Confidence,
                      },
                    ];
                    arrayTextLine.push(newElem);
                  }

                  // Captura de valores left devengos
                  if (block.Text.toUpperCase().startsWith("DEVENGOS")) {
                    leftEarns = block.Geometry.BoundingBox.Left.toFixed(2);
                  }

                  // Captura de valores left descuentos
                  if (block.Text.toUpperCase().startsWith("DESCUENTOS")) {
                    leftDiscounts = block.Geometry.BoundingBox.Left.toFixed(2);
                  }

                  // #################################################### fin if
                }
              }
              // ################################################## fin for
            }
          }

          /**
           * Posición inicial de tabla de devengos / descuentos
           */
          let init = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf("Concepto");

          /**
           * Posición final de tabla de devengos / descuentos
           */
          let end = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf("Unidad Org.");

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

          /**
           * sacamos todas las lineas leidas
           */
          for (let i = 0; i < arrayTextLine.length; i++) {
            let bloque = i + 1;
            let columna = 0;

            arrayTextLine[i].arrayText.map((x) => {
              if (x.text === "Total Devengos" || x.text === "Total Devenges") {
                columna = 1;
                jsonClient.client.devengos.subtotal =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Total Descuentos") {
                columna = 2;
                jsonClient.client.descuentos.subtotal =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Empleado") {
                if (
                  arrayTextLine[i + 1].arrayText[columna].text === "Comdata"
                ) {
                  jsonClient.client.name =
                    arrayTextLine[i + 2].arrayText[columna].text;
                } else {
                  jsonClient.client.name =
                    arrayTextLine[bloque].arrayText[columna].text;
                }
              }

              if (x.text === "EPS") {
                columna = 1;
                jsonClient.client.salud =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Ingreso" || x.text === "Ingreao") {
                jsonClient.client.fechaIngreso =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "AFP") {
                columna = 2;
                jsonClient.client.pension =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Unidad Org.") {
                jsonClient.client.convenio =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (
                x.text === "Neto a Pagar" ||
                x.text === "Neto Pagar" ||
                x.text === "Noto Pagar"
              ) {
                columna = 3;
                jsonClient.client.sueldoNeto =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Sueldo Base" || x.text === "Sualdo Base") {
                columna = 4;
                jsonClient.client.basico =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (x.text === "Núm. Documento") {
                columna = 3;
                jsonClient.client.documentNumber =
                  arrayTextLine[bloque].arrayText[columna].text;
              }

              if (
                x.text.toUpperCase().startsWith("PERIODO PAGO:") ||
                x.text.toUpperCase().startsWith("PERÍODO PAGO:") ||
                x.text.toUpperCase().startsWith("PERÍODO PAGA:")
              ) {
                columna = 0;
                if (x.text.split(" ")[4] === undefined) {
                  // "El periodo de pago viene en distintas lineas";
                  columna = 1;
                  jsonClient.client.nomina =
                    arrayTextLine[i].arrayText[columna].text.split(" ")[2];
                } else {
                  jsonClient.client.nomina =
                    arrayTextLine[i].arrayText[columna].text.split(" ")[4];
                }
              }

              // let regex = /^[0-9]*$/;
              if (
                arrayTextLine[i].arrayText[0].text
                  .toUpperCase()
                  .startsWith("BANCO")
              ) {
                let texto = arrayTextLine[i].arrayText[0].text;
                //Si la linea contiene numeros es es el numero de cuenta
                if (!isNaN(parseInt(texto.replace(/\D/g, "")))) {
                  jsonClient.client.banco.account = arrayTextLine[i].arrayText[
                    columna
                  ].text.replace(/\D/g, "");
                  jsonClient.client.banco.name = arrayTextLine[i].arrayText[
                    columna
                  ].text.replace(/[0-9]+/g, "");
                } else {
                  //Se guarda el numero de cuenta de la siguiente linea

                  jsonClient.client.banco.name = arrayTextLine[i].arrayText[
                    columna
                  ].text.replace(/[0-9]+/g, "");

                  jsonClient.client.banco.account = arrayTextLine[
                    bloque
                  ].arrayText[columna].text.replace(/\D/g, "");
                }
              }

              if (
                x.text.toUpperCase().includes("S.A.S") ||
                x.text.toUpperCase().includes("DIGITEX")
              ) {
                jsonCompany.company.name =
                  arrayTextLine[i].arrayText[columna].text;
              }

              if (x.text.toUpperCase().startsWith("NIT")) {
                columna = 0;
                if (x.text.includes(":")) {
                  jsonCompany.company.nit =
                    arrayTextLine[i].arrayText[columna].text.slice(4);
                } else {
                  jsonCompany.company.nit =
                    arrayTextLine[i].arrayText[columna].text.slice(3);
                }
              }

              if (x.text.toUpperCase().startsWith("CARGO:")) {
                //Si trae 2 bloques, tomar la columna 1
                if (arrayTextLine[i].arrayText.length === 2) {
                  columna = 1;
                  jsonClient.client.cargo =
                    arrayTextLine[i].arrayText[columna].text.split(":")[1];
                } else {
                  //Si solo trae 1, la columna 0
                  jsonClient.client.cargo =
                    arrayTextLine[i].arrayText[columna].text.split(":")[1];
                }
              }

              // Calculo de puntuacion de confiabilidad de lectura del documento
              contConfidence += x.confidence;
              totalDatos++;
              jsonClient.client.confidence = (
                contConfidence / totalDatos
              ).toFixed(2);
            });
          }

          // let allowedData = /^[0-9]*(\.?)[0-9]+$/;
          // x.text.match(allowedData) &&
          /**
           * Objeto que guarda los elementos que tengan devengos
           */
          let elementDevengos = {};

          /**
           * Objeto que guarda los elementos que tengan descuentos
           */
          let elementDescuentos = {};

          /**
           * Objeto que guarda los elementos que no son ni devengos
           * ni descuentos
           */
          let norDevNorDesc = {};

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
           * Siendo asi:
           *
           * arrayTextLine[i].arrayText[0] -> Columna Concepto
           * arrayTextLine[i].arrayText[1] -> Columna Unidades
           * arrayTextLine[i].arrayText[2] -> Columna Precio
           * arrayTextLine[i].arrayText[3] -> Columna Devengos o Descuento
           */

          /**
           * Indices de referencia de la tabla
           */
          let leftColumnaPrecio = 0;
          let leftColumnaUnidades = 0;

          for (let i = init + 1; i < end; i++) {
            leftColumnaUnidades = arrayTextLine[i].arrayText[1]?.left;

            /**
             * Variable ternaria que pregunta si la columna unidad es vacia
             * guarda el valor de devengo/descuento en su respectivo campo
             */
            let columnaUnidadVacia =
              arrayTextLine[i].arrayText[1]?.left >= leftColumnaUnidades
                ? arrayTextLine[i].arrayText[1]?.text
                : 0;

            /**
             * Referencia para guardar el dato precio
             */
            leftColumnaPrecio = arrayTextLine[i].arrayText[2]?.left;

            //Recorrido de cada columna para guardar los datos
            arrayTextLine[i].arrayText.map((x) => {
              // List de devengos
              if (x.left > leftEarns && x.left < leftDiscounts) {
                // console.log(arrayTextLine[i].arrayText[0].text);
                elementDevengos = {
                  concepto: arrayTextLine[i].arrayText[0]?.text,
                  unidades:
                    arrayTextLine[i].arrayText[1]?.left >= leftEarns
                      ? 0
                      : arrayTextLine[i].arrayText[1]?.text,
                  precio:
                    arrayTextLine[i].arrayText[2]?.left >= leftColumnaPrecio
                      ? arrayTextLine[i].arrayText[2]?.text
                      : 0,
                  devengo:
                    arrayTextLine[i].arrayText[3]?.left >= leftEarns
                      ? arrayTextLine[i].arrayText[3]?.text
                      : columnaUnidadVacia,
                };

                contConfidence += x.confidence;
                totalDatos++;
                jsonClient.client.devengos.confidence = (
                  contConfidence / totalDatos
                ).toFixed(2);
                jsonClient.client.devengos.list.push(elementDevengos);
              }

              // List de descuentos
              else if (x.left >= leftDiscounts) {
                elementDescuentos = {
                  concepto: arrayTextLine[i].arrayText[0]?.text,
                  unidades:
                    arrayTextLine[i].arrayText[1]?.left >= leftDiscounts
                      ? 0
                      : arrayTextLine[i].arrayText[1]?.text,
                  precio:
                    arrayTextLine[i].arrayText[2]?.left >= leftColumnaPrecio
                      ? arrayTextLine[i].arrayText[2]?.text
                      : 0,
                  descuentos:
                    arrayTextLine[i].arrayText[3]?.left >= leftDiscounts
                      ? arrayTextLine[i].arrayText[3]?.text
                      : columnaUnidadVacia,
                };

                contConfidence += x.confidence;
                totalDatos++;
                jsonClient.client.descuentos.confidence = (
                  contConfidence / totalDatos
                ).toFixed(2);
                jsonClient.client.descuentos.list.push(elementDescuentos);
              }
            });
            // Datos que no son ni devengos ni descuentos y se
            // almacenan en descuentos
            if (
              arrayTextLine[i].arrayText[3]?.text === undefined &&
              arrayTextLine[i].arrayText[4]?.text === undefined &&
              arrayTextLine[i].arrayText[1].left < leftDiscounts
            ) {
              norDevNorDesc = {
                concepto: arrayTextLine[i].arrayText[0]?.text,
                unidades: arrayTextLine[i].arrayText[1]?.text,
                precio:
                  arrayTextLine[i].arrayText[2]?.left >= leftColumnaPrecio
                    ? arrayTextLine[i].arrayText[2]?.text
                    : 0,
                descuentos: 0,
              };
              jsonClient.client.descuentos.list.push(norDevNorDesc);
            }
          }

          // console.log(jsonClient.client.devengos);
          // console.log(jsonClient.client.descuentos);

          resultArray.push(jsonClient);
          resultArray.push(jsonCompany);

          // console.log("JSON A EXPORTAR");
          // console.log(resultArray);

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

const sideDocument = () => {};

module.exports = { readPaymentgSupport };
