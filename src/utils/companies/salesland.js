var path = require("path");
// const fs = require("fs");
const { documentExtract } = require("../utils.js");

const readMultipleLines = (
  i,
  textValidation,
  textReceived,
  columnOrigen,
  columnValidation,
  array = []
) => {
  let saveData;
  if (array[i + 1].arrayText[columnValidation]?.text.includes(textValidation)) {
    saveData = textReceived.text.split(" ").slice(1).join(" ");
  } else if (
    array[i + 2].arrayText[columnValidation]?.text.includes(textValidation)
  ) {
    saveData = textReceived.text
      .split(" ")
      .slice(1)
      .join(" ")
      .concat(" " + array[i + 1].arrayText[columnOrigen]?.text);
  } else if (
    array[i + 3].arrayText[columnValidation]?.text.includes(textValidation)
  ) {
    saveData = textReceived.text
      .split(" ")
      .slice(1)
      .join(" ")
      .concat(
        " " +
          array[i + 1].arrayText[columnOrigen]?.text +
          " " +
          array[i + 2].arrayText[columnOrigen]?.text
      );
  } else if (
    array[i + 4].arrayText[columnValidation]?.text.includes(textValidation)
  ) {
    saveData = textReceived.text
      .split(" ")
      .slice(1)
      .join(" ")
      .concat(
        " " +
          array[i + 1].arrayText[columnOrigen]?.text +
          " " +
          array[i + 2].arrayText[columnOrigen]?.text +
          " " +
          array[i + 3].arrayText[columnOrigen]?.text
      );
  }

  return saveData;
};

const readPaymentgSupport = (filePath, isRequest = false) =>
  new Promise((resolve, reject) => {
    try {
      let ext = path.extname(filePath);

      let arrayTextLine = [];

      /**
       * Json de resultado
       */
      let resultObject = {};

      /**
       * Left de devengos
       */
      let leftEarns = 0;

      /**
       * Left de descuentos
       */
      let leftDiscounts = 0;

      let contConfidence = 0;
      let contConfidence2 = 0;
      let totalDatos = 0;
      let totalDatos2 = 0;

      let client = {
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
        fechaIngreso: "NO REGISTRA",
        devengos: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        confidence: null,
        sueldoNeto: null,
        deducciones: {
          list: [],
          subtotal: null,
          confidence: null,
        },
        documentNumber: "",
      };

      let company = {
        nit: "",
        name: "",
      };

      let client2 = {
        fechaIngreso: "NO REGISTRA",
        banco: {},
        devengos: {},
        deducciones: {},
      };

      let company2 = {};

      let arrayAux = [];

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
                // console.log(strTop);

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
                    top: ":::" + strTop,
                    text: block.Text,
                    left: block.Geometry.BoundingBox.Left.toFixed(2),
                    confidence: block.Confidence,
                  });
                } else {
                  let newElem = {};
                  newElem.top = parseFloat(strTop);
                  newElem.arrayText = [
                    {
                      top: strTop,
                      text: block.Text,
                      left: block.Geometry.BoundingBox.Left.toFixed(2),
                      confidence: block.Confidence,
                    },
                  ];
                  arrayTextLine.push(newElem);
                }

                // Guardando nominas para comparar si hay mas de 2 facturas
                // en 1 sola imagen
                if (block.Text.toUpperCase().includes("NOMINA")) {
                  arrayAux.push(block.Text);
                }

                // #################################################### fin if
              }
            }
            // ################################################## fin for
          }

          /**
           * Lee 2 facturas con fechas distintas en un mismo documento
           */
          let dobleFactura = false;

          if (arrayAux.length === 2) {
            let nominaPrimeraFactura = arrayAux[0].split(" ").pop();
            let nominaSegundaFactura = arrayAux[1].split(" ").pop();
            if (nominaPrimeraFactura !== nominaSegundaFactura) {
              dobleFactura = true;
            }
          }

          /**
           * Referencias left de las columnas de la tabla
           */
          let leftBasic;
          let leftConceptoDevengo;
          let leftPension;

          /**
           * Posición inicial de tabla de dev/ded
           */
          let init = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf("DEVENGOS");

          console.log(init);
          // let init2 =

          // referencia para capturar el fin de la tabla

          /**
           * Posición final de tabla de dev/ded y campo
           * de subtotales devengos y deducciones
           */
          let end = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf("SUBTOTAL");

          console.log(end);
          /**
           * Coordenadas top del documento
           */
          let top;

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
            // let columna = 0;

            arrayTextLine[i].arrayText.map((x) => {
              if (x.top.includes(":::")) {
                top = x.top.split(":::")[1];
              } else {
                top = x.top;
              }

              // Calculo de puntuacion de confiabilidad de lectura del documento
              if (dobleFactura) {
                if (top < 0.5) {
                  contConfidence += x.confidence;
                  totalDatos++;
                  client.confidence = (contConfidence / totalDatos).toFixed(2);
                }
                if (top > 0.5) {
                  contConfidence2 += x.confidence;
                  totalDatos2++;
                  client2.confidence = (contConfidence2 / totalDatos2).toFixed(
                    2
                  );
                }
              } else {
                contConfidence += x.confidence;
                totalDatos++;
                client.confidence = (contConfidence / totalDatos).toFixed(2);
              }

              // Guardando nombre de la compañía
              if (
                dobleFactura &&
                x.text.includes("COLOMBIA S.A") &&
                !x.text.includes("BANCO")
              ) {
                top < 0.5 && (company.name = x.text);
                top > 0.5 && (company2.name = x.text);
              } else if (
                x.text.includes("COLOMBIA S.A") &&
                !x.text.includes("BANCO")
              ) {
                company.name = x.text;
              }

              // Guardando nombre y documento del cliente
              if (dobleFactura && x.text.startsWith("COMPROBANTE DE PAGO")) {
                if (top < 0.5) {
                  client.documentNumber =
                    arrayTextLine[block].arrayText[2]?.text;
                  client.name = arrayTextLine[block].arrayText[0]?.text;

                  // Captura de nit primera factura
                  arrayTextLine[i - 1].arrayText.map((nit) => {
                    if (nit.text.includes("-")) {
                      company.nit = nit.text.split(" ").pop();
                    }
                  });
                }
                if (top > 0.5) {
                  client2.documentNumber =
                    arrayTextLine[block].arrayText[2]?.text;
                  client2.name = arrayTextLine[block].arrayText[0]?.text;

                  // Captura de nit segunda factura
                  arrayTextLine[i - 1].arrayText.map((nit) => {
                    if (nit.text.includes("-")) {
                      company2.nit = nit.text.split(" ").pop();
                    }
                  });
                }
              } else if (x.text.startsWith("COMPROBANTE DE PAGO")) {
                client.documentNumber = arrayTextLine[block].arrayText[2]?.text;
                client.name = arrayTextLine[block].arrayText[0]?.text;

                // Captura de nit
                arrayTextLine[i - 1].arrayText.map((nit) => {
                  if (nit.text.includes("-")) {
                    company.nit = nit.text.split(" ").pop();
                  }
                });
              }

              // Guardando convenio
              if (dobleFactura && x.text.toUpperCase().startsWith("CONVENIO")) {
                top < 0.5 &&
                  (client.convenio = x.text.split(" ").slice(1).join(" "));
                top > 0.5 &&
                  (client2.convenio = x.text.split(" ").slice(1).join(" "));
              } else if (x.text.toUpperCase().startsWith("CONVENIO")) {
                client.convenio = x.text.split(" ").slice(1).join(" ");
              }

              // Guardando nomina
              if (dobleFactura && x.text.toUpperCase().startsWith("NOMINA")) {
                top < 0.5 && (client.nomina = x.text.split(" ").pop());
                top > 0.5 && (client2.nomina = x.text.split(" ").pop());
              } else if (x.text.toUpperCase().startsWith("NOMINA")) {
                client.nomina = x.text.split(" ").pop();
              }

              // Guardando pension
              if (dobleFactura && x.text.toUpperCase().startsWith("PENSION")) {
                leftPension = x.left;
                // Validando que tenga varias lineas la pension en la primera factura
                if (top < 0.5) {
                  client.pension = readMultipleLines(
                    i,
                    "CUENTA",
                    x,
                    0,
                    1,
                    arrayTextLine
                  );
                }
                // Validando que tenga varias lineas la pension en la segunda factura
                if (top > 0.5) {
                  client2.pension = readMultipleLines(
                    i,
                    "CUENTA",
                    x,
                    0,
                    1,
                    arrayTextLine
                  );
                }
              } else if (x.text.toUpperCase().startsWith("PENSION")) {
                leftPension = x.left;
                // Validando que tenga varias lineas la pension
                client.pension = readMultipleLines(
                  i,
                  "CUENTA",
                  x,
                  0,
                  1,
                  arrayTextLine
                );
              }

              // Guardando numero de cuenta
              if (dobleFactura && x.text.toUpperCase().startsWith("CUENTA")) {
                top < 0.5 && (client.banco.account = x.text.split(" ").pop());
                top > 0.5 && (client2.banco.account = x.text.split(" ").pop());
              } else if (x.text.toUpperCase().startsWith("CUENTA")) {
                client.banco.account = x.text.split(" ").pop();
              }

              // Guardando nombre del banco
              if (dobleFactura && x.text.toUpperCase().startsWith("BANCO")) {
                top < 0.5 &&
                  (client.banco.name = readMultipleLines(
                    i,
                    "DEVENGOS",
                    x,
                    0,
                    0,
                    arrayTextLine
                  ));
                top > 0.5 &&
                  (client2.banco.name = readMultipleLines(
                    i,
                    "DEVENGOS",
                    x,
                    0,
                    0,
                    arrayTextLine
                  ));
              } else if (x.text.toUpperCase().startsWith("BANCO")) {
                client.banco.name = readMultipleLines(
                  i,
                  "DEVENGOS",
                  x,
                  0,
                  0,
                  arrayTextLine
                );
              }

              // Guardando salario base
              if (dobleFactura && x.text.startsWith("BASICO")) {
                top < 0.5 && (client.basico = x.text.split(" ").pop());
                top > 0.5 && (client2.basico = x.text.split(" ").pop());
                leftBasic = (x.left - 0.03).toFixed(2);
              } else if (x.text.startsWith("BASICO")) {
                leftBasic = (x.left - 0.03).toFixed(2);
                client.basico = x.text.split(" ").pop();
              }

              // Guardando cargo
              if (dobleFactura && x.text.startsWith("CARGO")) {
                top < 0.5 &&
                  (client.cargo = x.text.includes(":")
                    ? x.text.split(":").slice(1).join(" ").trim()
                    : x.text.split(" ").slice(1).join(" "));
                top > 0.5 &&
                  (client2.cargo = x.text.includes(":")
                    ? x.text.split(":").slice(1).join(" ").trim()
                    : x.text.split(" ").slice(1).join(" "));
              } else if (x.text.startsWith("CARGO")) {
                client.cargo = x.text.includes(":")
                  ? x.text.split(":").slice(1).join(" ").trim()
                  : x.text.split(" ").slice(1).join(" ");
              }

              // Guardando salud
              if (dobleFactura && x.text.startsWith("SALUD")) {
                top < 0.5 &&
                  (client.salud = x.text.split(" ").slice(1).join(" "));
                top > 0.5 &&
                  (client2.salud = x.text.split(" ").slice(1).join(" "));
              } else if (x.text.startsWith("SALUD")) {
                client.salud = x.text.split(" ").slice(1).join(" ");
              }

              // Guardando neto
              if (
                dobleFactura &&
                (x.text.includes("CVS") || x.text.startsWith("SON"))
              ) {
                // Primera Factura validando signo $
                leftConceptoDevengo = x.left;
                top < 0.5 &&
                  (client.sueldoNeto = arrayTextLine[
                    i - 1
                  ].arrayText[0]?.text.includes("$")
                    ? arrayTextLine[i - 1].arrayText[0]?.text
                        .split("$")[1]
                        .trim()
                    : arrayTextLine[i - 1].arrayText[0]?.text);

                top > 0.5 &&
                  (client2.sueldoNeto = arrayTextLine[
                    i - 1
                  ].arrayText[0]?.text.includes("$")
                    ? arrayTextLine[i - 1].arrayText[0]?.text
                        .split("$")[1]
                        .trim()
                    : arrayTextLine[i - 1].arrayText[0]?.text);
              }
              // Unica factura
              else if (x.text.includes("CVS") || x.text.startsWith("SON")) {
                leftConceptoDevengo = x.left;
                let lastBlock = arrayTextLine[i - 1].arrayText[0]?.text;
                if (lastBlock.includes("$")) {
                  client.sueldoNeto = lastBlock.split("$")[1].trim();
                } else {
                  client.sueldoNeto = lastBlock;
                }
              }

              // Guardando subtotales de devengos/deducciones
              if (dobleFactura && x.text.toUpperCase().includes("SUBTOTAL")) {
                if (top < 0.5) {
                  // Captura de devengos primera factura
                  if (arrayTextLine[i].arrayText[1]?.text.includes("$")) {
                    client.devengos.subtotal = arrayTextLine[
                      i
                    ].arrayText[1]?.text
                      .split("$")[1]
                      .trim();
                  } else {
                    client.devengos.subtotal =
                      arrayTextLine[i].arrayText[1]?.text;
                  }
                  // Captura de deducciones primera factura
                  if (arrayTextLine[i].arrayText[3]?.text.includes("$")) {
                    client.deducciones.subtotal = arrayTextLine[
                      i
                    ].arrayText[3]?.text
                      .split("$")[1]
                      .trim();
                  } else {
                    client.deducciones.subtotal =
                      arrayTextLine[i].arrayText[3]?.text;
                  }
                }

                if (top > 0.5) {
                  // Captura de devengos segunda factura
                  if (arrayTextLine[i].arrayText[1]?.text.includes("$")) {
                    client2.devengos.subtotal = arrayTextLine[
                      i
                    ].arrayText[1]?.text
                      .split("$")[1]
                      .trim();
                  } else {
                    client2.devengos.subtotal =
                      arrayTextLine[i].arrayText[1]?.text;
                  }
                  // Captura de deducciones segunda factura
                  if (arrayTextLine[i].arrayText[3]?.text.includes("$")) {
                    client2.deducciones.subtotal = arrayTextLine[
                      i
                    ].arrayText[3]?.text
                      .split("$")[1]
                      .trim();
                  } else {
                    client2.deducciones.subtotal =
                      arrayTextLine[i].arrayText[3]?.text;
                  }
                }
              } else if (x.text.toUpperCase().includes("SUBTOTAL")) {
                // Captura de devengos unica factura
                if (arrayTextLine[i].arrayText[1]?.text.includes("$")) {
                  client.devengos.subtotal = arrayTextLine[i].arrayText[1]?.text
                    .split("$")[1]
                    .trim();
                } else {
                  client.devengos.subtotal =
                    arrayTextLine[i].arrayText[1]?.text;
                }
                // Captura de deducciones unica factura
                if (arrayTextLine[i].arrayText[3]?.text.includes("$")) {
                  client.deducciones.subtotal = arrayTextLine[
                    i
                  ].arrayText[3]?.text
                    .split("$")[1]
                    .trim();
                } else {
                  client.deducciones.subtotal =
                    arrayTextLine[i].arrayText[3]?.text;
                }
              }
            });
          }

          /**
           * Objeto que guarda los elementos que tengan devengos
           */
          let elementDevengos = {};

          /**
           * Objeto que guarda los elementos que tengan descuentos
           */
          let elementDeducciones = {};

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

          // SI NO HAY DATOS EN LA TABLA
          if (init + 1 === end) {
            client.devengos.confidence = "0";
            client.deducciones.confidence = "0";
          }

          /**
           * Variable que guarda la posicion de la columna
           * donde se encuentra el basico, usada como referencia
           * para capturar datos de la tabla de deducciones
           */
          let indiceCodigoDeduccion;

          // Referencias left del encabezado de la tabla
          leftEarns = arrayTextLine[init].arrayText[0]?.left;
          let leftCantidadDevengo = arrayTextLine[init].arrayText[1]?.left;
          let leftValorDevengo = arrayTextLine[init].arrayText[2]?.left;
          leftDiscounts = arrayTextLine[init].arrayText[3]?.left;
          let leftCantidadDeduccion = arrayTextLine[init].arrayText[4]?.left;
          let leftValorDeduccion = arrayTextLine[init].arrayText[5]?.left;

          // RECORRIDO DE TABLA
          for (let i = init + 1; i < end; i++) {
            // Captura de devengos
            if (arrayTextLine[i].arrayText[0]?.left < leftBasic) {
              arrayTextLine[i].arrayText.map((x) => {
                if (x.left < leftBasic) {
                  let valueOnAmount =
                    arrayTextLine[i].arrayText[2]?.left >= leftCantidadDevengo
                      ? arrayTextLine[i].arrayText[2]?.text
                      : 0;

                  let conceptoCodigo =
                    arrayTextLine[i].arrayText[0]?.left > leftEarns
                      ? 0
                      : arrayTextLine[i].arrayText[0]?.text;
                  let concepto =
                    // 0.10 > 0.03 0.10
                    arrayTextLine[i].arrayText[1]?.left ===
                      arrayTextLine[i + 1].arrayText[0]?.left &&
                    arrayTextLine[i + 1].arrayText[1] === undefined
                      ? arrayTextLine[i].arrayText[1]?.text.concat(
                          " " + arrayTextLine[i + 1].arrayText[0]?.text
                        )
                      : arrayTextLine[i].arrayText[1]?.text;
                  let unidades =
                    arrayTextLine[i].arrayText[2]?.left < leftValorDevengo
                      ? arrayTextLine[i].arrayText[2]?.text
                      : 0;
                  let devengo =
                    arrayTextLine[i].arrayText[3]?.left < leftBasic
                      ? arrayTextLine[i].arrayText[3]?.text
                      : valueOnAmount;

                  elementDevengos = {
                    conceptoCodigo,
                    concepto,
                    unidades,
                    precio: "N/A",
                    devengo,
                  };
                  contConfidence += x.confidence;
                  totalDatos++;
                  client.devengos.confidence = (
                    contConfidence / totalDatos
                  ).toFixed(2);
                }
              });
              if (
                !(
                  arrayTextLine[i].arrayText[0]?.left > leftConceptoDevengo &&
                  arrayTextLine[i].arrayText[0]?.left < leftCantidadDevengo
                )
              ) {
                client.devengos.list.push(elementDevengos);
              }
            }
            // TODO: Lectura de deducciones

            arrayTextLine[i].arrayText.map((x) => {
              if (x.left >= leftBasic && x.left < leftDiscounts) {
                indiceCodigoDeduccion = arrayTextLine[i].arrayText.findIndex(
                  (center) => {
                    return x === center;
                  }
                );
              }
              if (x.left > leftBasic) {
                contConfidence += x.confidence;
                totalDatos++;
                client.deducciones.confidence = (
                  contConfidence / totalDatos
                ).toFixed(2);
              }
            });

            if (arrayTextLine[i].arrayText[indiceCodigoDeduccion]) {
              // console.log(indiceCodigoDeduccion);
              // let valueOnAmount =

              let conceptoCodigo =
                arrayTextLine[i].arrayText[indiceCodigoDeduccion]?.text;
              let concepto =
                arrayTextLine[i].arrayText[indiceCodigoDeduccion + 1]?.text;
              let unidades =
                arrayTextLine[i].arrayText[indiceCodigoDeduccion + 2]?.left <
                leftValorDeduccion
                  ? arrayTextLine[i].arrayText[indiceCodigoDeduccion + 2]?.text
                  : 0;
              let deduccion =
                arrayTextLine[i].arrayText[indiceCodigoDeduccion + 2]?.left >=
                leftValorDeduccion
                  ? arrayTextLine[i].arrayText[indiceCodigoDeduccion + 2]?.text
                  : arrayTextLine[i].arrayText[indiceCodigoDeduccion + 3]?.text;

              elementDeducciones = {
                conceptoCodigo,
                concepto,
                unidades,
                precio: "N/A",
                deduccion,
              };

              client.deducciones.list.push(elementDeducciones);
            }
          }

          // MUESTREO TEMPORAL
          // console.log(":::::::::::::::::::DEVENGOS:::::::::::::::::::");
          // console.log(client.devengos);
          console.log(":::::::::::::::::::DEDUCCIONES:::::::::::::::::::");
          console.log(client.deducciones);

          // AÑADIENDO LOS RESULTADOS DE LOS OBJETOS
          //   resultObject = {
          //     client,
          //     company,
          //   };

          if (dobleFactura) {
            resultObject = { client, company, client2, company2 };
          } else {
            resultObject = { client, company };
          }

          // console.log(client2);

          // arrayTextLine.map((x) => console.log(x));
          jsonToRead ? resolve(resultObject) : resolve(false);
        })();
      }
    } catch (error) {
      console.log("ERROR");
      console.log(error);
      resolve(false);
    }
  });

module.exports = { readPaymentgSupport };
