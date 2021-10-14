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
      let totalDatos = 0;

      let client = {
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

      let endFirma;

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

                // Captura de valores left devengos
                if (
                  block.Text.toUpperCase().startsWith(
                    "CONCEP DESCRIPCION CONCEPTO"
                  ) ||
                  block.Text.toUpperCase().startsWith(
                    "CONCEP DESCRIPCIÓN CONCEPTO"
                  ) ||
                  block.Text.toUpperCase().startsWith(
                    "CONCEP DESCRIPCIONCONCEPTO"
                  )
                ) {
                  leftEarns = block.Geometry.BoundingBox.Left.toFixed(2);
                }

                // Captura de valores left descuentos
                if (
                  (block.Text.toUpperCase().includes("CENTRO COSTO") ||
                    block.Text.toUpperCase().includes("CENTROCOSTO") ||
                    block.Text.toUpperCase().startsWith("CENTRO") ||
                    block.Text.toUpperCase().includes("CENTROCOSTO/CONCEP")) &&
                  !block.Text.toUpperCase().includes("UTILIDAD")
                ) {
                  leftDiscounts = block.Geometry.BoundingBox.Left.toFixed(2);
                }

                if (block.Text.toUpperCase().includes("FIRMA")) {
                  endFirma = block.Text;
                }

                // #################################################### fin if
              }
            }
            // ################################################## fin for
          }

          let textFindInit = arrayTextLine.map((e) => {
            return e.arrayText[0].text;
          });

          /**
           * Posición inicial de tabla de dev/ded
           */
          let init;

          if (textFindInit.indexOf("CONCEP DESCRIPCIONCONCEPTO") !== -1) {
            init = textFindInit.indexOf("CONCEP DESCRIPCIONCONCEPTO");
          } else if (
            textFindInit.indexOf("CONCEP DESCRIPCIÓN CONCEPTO") !== -1
          ) {
            init = textFindInit.indexOf("CONCEP DESCRIPCIÓN CONCEPTO");
          } else if (
            textFindInit.indexOf("CONCEP DESCRIPCION CONCEPTO") !== -1
          ) {
            init = textFindInit.indexOf("CONCEP DESCRIPCION CONCEPTO");
          } else if (textFindInit.indexOf("DESCRIPCION CONCEPTO") !== -1) {
            init = textFindInit.indexOf("DESCRIPCION CONCEPTO");
          }

          // referencia para capturar el fin de la tabla
          let calcEnd = arrayTextLine
            .map((e) => {
              return e.arrayText[0].text;
            })
            .indexOf(endFirma);

          /**
           * Posición final de tabla de dev/ded y campo
           * de subtotales devengos y deducciones
           */
          let end;
          // El neto se encuentra 3 bloques antes
          if (arrayTextLine[calcEnd - 3].arrayText[0]?.text.includes("NETO:")) {
            end = calcEnd - 4;
          }
          // El neto se encuentra 4 bloques antes
          else if (
            arrayTextLine[calcEnd - 4].arrayText[0]?.text.includes("NETO:")
          ) {
            end = calcEnd - 5;
          }
          // Bloques distribuidos correctamente
          else {
            end = calcEnd - 3;
          }

          /**
           * Coordenadas top del documento
           */
          let top;

          // GUARDANDO REFERENCIAS DE SUBTOTALES Y LEFTS DE DEVENGOS Y DEDUCCIONES
          /**
           * Referencia del bloque donde se encuentran los subtotales
           */
          let bloque = 0;
          // Subtotal de devengos y descuentos(deducciones)
          if (arrayTextLine[end].arrayText[0]?.text.includes("NETO:")) {
            bloque = end - 1;
            // EL BLOQUE TIENE NETO
            client.devengos.subtotal =
              arrayTextLine[bloque].arrayText[0]?.text.split("$ ")[1];
            client.deducciones.subtotal =
              arrayTextLine[bloque].arrayText[1]?.text.split("$ ")[1];
          } else {
            if (arrayTextLine[end - 2].arrayText[0]?.text.includes("$")) {
              client.devengos.subtotal = arrayTextLine[
                end - 2
              ].arrayText[0]?.text
                .split("$")[1]
                .trim()
                .split(" ")[0];
            }
            if (arrayTextLine[end].arrayText[1] === undefined) {
              client.deducciones.subtotal = arrayTextLine[
                end
              ].arrayText[0]?.text
                .split("$")[1]
                .trim();
            } else {
              // EL BLOQUE TIENE LA REFERENCIA DE SUBTOTALES

              // Si traen signo guardar sin signo
              client.devengos.subtotal = arrayTextLine[
                end
              ].arrayText[0]?.text.includes("$")
                ? arrayTextLine[end].arrayText[0]?.text.split("$")[1].trim()
                : arrayTextLine[end].arrayText[0]?.text;

              // Same thing
              client.deducciones.subtotal = arrayTextLine[
                end
              ].arrayText[1]?.text.includes("$")
                ? arrayTextLine[end].arrayText[1]?.text.split("$")[1].trim()
                : arrayTextLine[end].arrayText[1]?.text;
            }
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
              if (x.top.includes(":::")) {
                top = x.top.split(":::")[1];
              } else {
                top = x.top;
              }
              // GUARDANDO CONVENIO ###################### ----------------------------------
              if (
                x.text.startsWith("CENTRO DE UTILIDAD") &&
                parseFloat(top) < 0.7
              ) {
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

                client.convenio = textConvenio;
              }

              // GUARDANDO NOMBRE, CEDULA, SALARIO BASE (DEPENDIENDO DE)
              // LA LINEA ###################### ----------------------------------
              if (x.text.includes("NOMBRE") && parseFloat(top) < 0.7) {
                // Guardando Salario base dependiendo de la linea
                let text2BloqueDetras = arrayTextLine[i - 2].arrayText[0]?.text;
                let text2Bloque = arrayTextLine[i + 2].arrayText[0]?.text;

                let text4Bloque = arrayTextLine[i + 4].arrayText[0]?.text;

                let text6Bloque = arrayTextLine[i + 6].arrayText[0]?.text;

                // Guardando numero de cedula
                let textInicioDocumento = x.text.split("(")[1];
                let numDocumento = textInicioDocumento.split(")")[0];

                // Guardando sueldo
                let sueldo;
                // Si el sueldo viene en el bloque 4
                if (text4Bloque.includes("-")) {
                  if (text4Bloque.includes("$")) {
                    sueldo = text4Bloque.split("$")[1].trim();
                  } else {
                    sueldo = text4Bloque.split("-")[1].trim();
                  }
                }
                // Si el sueldo viene en el bloque 6
                else if (text6Bloque.includes("-")) {
                  if (text6Bloque.includes("$")) {
                    sueldo = text6Bloque.split("$")[1].trim();
                  } else {
                    sueldo = text6Bloque.split("-")[1].trim();
                  }
                }
                // Si el sueldo viene en la linea actual
                else if (x.text.includes("-")) {
                  //Caso especial viene hasta el guion - Viene en el bloque 2
                  if (x.text.split("- ")[1] === undefined) {
                    let omitirInfo = text2Bloque.split("$")[1];
                    sueldo = omitirInfo.split(" ")[1];
                  } else if (x.text.includes("$")) {
                    sueldo = x.text.split("$")[1].trim();
                  } else {
                    sueldo = x.text.split(" ").pop();
                  }
                } else if (x.text.includes("$")) {
                  // Caso especial
                  sueldo = x.text.split("$")[1].trim();
                } else {
                  //Caso especial
                  if (x.text.includes(",")) {
                    let getLastValue = x.text.split(" ").pop();
                    if (getLastValue.indexOf(".") === 4) {
                      sueldo = getLastValue.slice(1);
                    } else {
                      sueldo = getLastValue;
                    }
                  }
                }

                if (
                  (text2BloqueDetras.includes("NOMINA") &&
                    text2BloqueDetras.includes("$")) ||
                  (text2BloqueDetras.includes("NOMINA") &&
                    text2BloqueDetras.includes(","))
                ) {
                  let extraerSueldo = text2BloqueDetras.split("$")[1].trim();
                  sueldo = extraerSueldo.split(" ")[0];
                }

                client.basico = sueldo;

                client.documentNumber = numDocumento;

                // Guardando nombre del cliente
                let nameSeparado = x.text.split(":")[2].trim();
                let name = nameSeparado.split(" (")[0];
                client.name = name;
              }

              // GUARDANDO SUELDO NETO ###################### ----------------------------------
              if (x.text.includes("NETO: ")) {
                if (x.text.includes("$")) {
                  client.sueldoNeto = x.text.split("$")[1].trim();
                } else {
                  if (x.text.includes(":")) {
                    client.sueldoNeto = x.text.split(":")[1].trim();
                  } else {
                    client.sueldoNeto = x.text.split("NETO")[1].trim();
                  }
                }
              }

              // GUARDANDO NUMERO DE CUENTA BANCARIA Y NOMBRE
              // ###################### ----------------------------------
              if (
                x.text.toUpperCase().startsWith("MODO PAGO:") &&
                parseFloat(top) < 0.7
              ) {
                if (x.text.includes("<Ninguno>")) {
                  client.banco.account = "NO REGISTRA";
                  client.banco.name = "NO REGISTRA";
                } else {
                  client.banco.account = arrayTextLine[i].arrayText[
                    columna
                  ].text.replace(/\D/g, "");

                  let separarCad = x.text.split(" ");
                  let ubicacionBanco;
                  if (separarCad.indexOf("BBVA") !== -1) {
                    ubicacionBanco = separarCad.indexOf("BBVA");
                  } else if (separarCad.indexOf("BANCO") !== -1) {
                    ubicacionBanco = separarCad.indexOf("BANCO");
                  } else {
                    ubicacionBanco = separarCad.indexOf("BANCOLOMBIA");
                  }
                  let name = separarCad.slice(ubicacionBanco);
                  client.banco.name = name.join(" ");
                }
              }

              // GUARDANDO FECHA DE NOMINA ###################### -------------------------------
              if (x.text.includes("PERIODO:") && parseFloat(top) < 0.7) {
                let lengthCadena = x.text.split(" ").length;
                let capturaFecha = "";
                // Codigo periodo pegado a la primera fecha
                if (lengthCadena === 4) {
                  capturaFecha = x.text.split(" ")[3];
                } else if (lengthCadena === 5) {
                  // Codigo periodo despegado a la primera fecha
                  capturaFecha = x.text.split(" ")[4];
                } else if (lengthCadena === 3) {
                  capturaFecha = x.text.split(" ")[2];
                }
                let dividirFecha = capturaFecha.split("(")[1];
                let fecha = dividirFecha.split(")")[0];
                client.nomina = fecha;
              }

              // GUARDANDO NOMBRE DE EMPRESA Y NIT ###################### ------------------
              if (
                x.text.toUpperCase().includes("EMPRESA") &&
                parseFloat(top) < 0.3
                // !x.text.includes("Incapacidad Empresa")
              ) {
                // Datos del nit
                let dividirNit = "";
                let nit = "";

                // Datos de la empresa
                let dividirEmpresa = x.text.split(":")[1].trim();

                let name = dividirEmpresa.includes("(")
                  ? dividirEmpresa.split("(")[0].trim()
                  : dividirEmpresa;

                let nit4bloque = arrayTextLine[i + 4].arrayText[0]?.text;
                let nit6bloque = arrayTextLine[i + 6].arrayText[0]?.text;
                // Si el nombre de la empresa no captura numeros
                if (isNaN(parseInt(x.text.replace(/\D/g, "")))) {
                  // SOLO VIENE TEXTO

                  company.name = name;

                  // se guarda el nit del bloque i + 6 (Caso especial)
                  // Y si viene el sueldo base junto con el
                  // Sino esta en i+6, se guarda el caso especial i+4
                  if (
                    nit4bloque.includes("(") &&
                    !nit4bloque.includes("NOMBRE")
                  ) {
                    dividirNit = nit4bloque.split("(")[1];
                  } else {
                    dividirNit = nit6bloque.split("(")[1];
                  }
                  nit = dividirNit.split(")")[0];
                  company.nit = nit;
                } else {
                  // NOMBRE DE EMPRESA Y NIT EN LA MISMA LINEA

                  company.name = name;

                  dividirNit = x.text.split("(")[1];
                  nit = dividirNit.split(")")[0];

                  // Si el nit incluye un guión
                  if (x.text.includes("-")) {
                    company.nit = nit;
                  } else {
                    company.nit = x.text.replace(/\D/g, "");
                  }
                }
              }

              // Calculo de puntuacion de confiabilidad de lectura del documento
              contConfidence += x.confidence;
              totalDatos++;
              client.confidence = (contConfidence / totalDatos).toFixed(2);
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

          /**
           * Referencias left de las columnas de la tabla
           */

          let validarDevengoCorrido =
            arrayTextLine[init + 1].arrayText[2]?.left >= leftDiscounts
              ? arrayTextLine[init + 1].arrayText[2]?.left
              : arrayTextLine[init + 1].arrayText[4]?.left;

          let leftCentroCosto =
            arrayTextLine[init + 1].arrayText[3]?.left >= leftDiscounts
              ? arrayTextLine[init + 1].arrayText[3]?.left
              : validarDevengoCorrido;

          let leftConceptoDeduccion =
            arrayTextLine[init + 1].arrayText[5]?.left;

          // SI NO HAY DATOS EN LA TABLA
          if (init + 1 === end) {
            client.devengos.confidence = "0";
            client.deducciones.confidence = "0";
          }

          /**
           * Variable que guarda la posicion de la columna
           * donde se encuentra el centro de costo, usada como referencia
           * para capturar datos de la tabla de deducciones
           */
          let indiceColumnaCentroCosto;

          // RECORRIDO DE TABLA
          for (let i = init + 1; i < end; i++) {
            if (arrayTextLine[i].arrayText[0]?.left < leftDiscounts) {
              let conceptoCodigo;
              let concepto;
              let unidades;
              let devengo;
              arrayTextLine[i].arrayText.map((x) => {
                let desc;
                // Captura de devengos

                if (x.left >= leftEarns && x.left < leftDiscounts) {
                  if (arrayTextLine[i].arrayText[0]?.left < leftCentroCosto) {
                    // Caso especial
                    // Si recibe devengo en la columna debida
                    if (arrayTextLine[i].arrayText[3]?.text.includes("$")) {
                      // Valida que no venga con doble signo $
                      if (
                        arrayTextLine[i].arrayText[3]?.text.split("$")[1] ===
                        " "
                      ) {
                        devengo = arrayTextLine[i].arrayText[3]?.text
                          .split("$")[2]
                          .trim();
                      } else {
                        devengo = arrayTextLine[i].arrayText[3]?.text
                          .split("$")[1]
                          .trim();
                      }
                    }
                    // Si recibe devengo en la columna 2
                    else if (
                      arrayTextLine[i].arrayText[2]?.text.includes("$")
                    ) {
                      // Valida que no venga con doble signo $
                      if (
                        arrayTextLine[i].arrayText[2]?.text.split("$")[1] ===
                        " "
                      ) {
                        devengo = arrayTextLine[i].arrayText[2]?.text
                          .split("$")[2]
                          .trim();
                      } else {
                        devengo = arrayTextLine[i].arrayText[2]?.text
                          .split("$")[1]
                          .trim();
                      }
                    }
                    // Si recibe devengo en la columna 1
                    else if (
                      arrayTextLine[i].arrayText[1]?.text.includes("$")
                    ) {
                      devengo = arrayTextLine[i].arrayText[1]?.text
                        .split("$")[1]
                        .trim();
                    } else {
                      devengo = "0";
                    }

                    desc = arrayTextLine[i].arrayText[0]?.text
                      .replace(/[\d]+/g, "")
                      .split(". ")[1];

                    // Si solo viene el codigo del concepto
                    if (!desc) {
                      conceptoCodigo = arrayTextLine[i].arrayText[0]?.text;
                      concepto = arrayTextLine[i].arrayText[1]?.text;
                      unidades =
                        arrayTextLine[i].arrayText[2]?.left >= leftDiscounts ||
                        arrayTextLine[i].arrayText[2]?.text.includes("$")
                          ? "0"
                          : arrayTextLine[i].arrayText[2]?.text;
                    } else {
                      conceptoCodigo = arrayTextLine[
                        i
                      ].arrayText[0]?.text.replace(/\D/g, "");
                      concepto = arrayTextLine[i].arrayText[0]?.text
                        .replace(/[\d]+/g, "")
                        .split(". ")[1]
                        .trim();
                      unidades =
                        arrayTextLine[i].arrayText[1]?.left >= leftDiscounts ||
                        arrayTextLine[i].arrayText[1]?.text.includes("$")
                          ? "0"
                          : arrayTextLine[i].arrayText[1]?.text;
                    }

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
                }
              });
              if (concepto) {
                client.devengos.list.push(elementDevengos);
              }
            }
            if (!leftConceptoDeduccion) {
              client.deducciones.confidence = "0";
            } else {
              // Captura de deducciones
              let concepto;
              let conceptoCodigo;
              let deduccion;
              arrayTextLine[i].arrayText.map((x) => {
                //Margen de error
                if (
                  (x.left - 0.01).toFixed(2) === leftCentroCosto ||
                  x.left === leftCentroCosto ||
                  (parseFloat(x.left) + 0.01).toFixed(2).toString() ===
                    leftCentroCosto
                ) {
                  indiceColumnaCentroCosto = arrayTextLine[
                    i
                  ].arrayText.findIndex((center) => {
                    return x === center;
                  });
                }
                if (x.left > leftDiscounts) {
                  contConfidence += x.confidence;
                  totalDatos++;
                  client.deducciones.confidence = (
                    contConfidence / totalDatos
                  ).toFixed(2);
                }
              });

              let initDeducciones = indiceColumnaCentroCosto + 1;

              if (arrayTextLine[i].arrayText[initDeducciones]) {
                if (
                  arrayTextLine[i].arrayText[
                    initDeducciones + 1
                  ]?.text.includes("$")
                ) {
                  deduccion = arrayTextLine[i].arrayText[
                    initDeducciones + 1
                  ]?.text
                    .split("$")[1]
                    .trim();
                  concepto = arrayTextLine[i].arrayText[initDeducciones]?.text
                    .replace(/[\d]/g, "")
                    .split(".")[1]
                    .trim();
                  conceptoCodigo = arrayTextLine[i].arrayText[
                    initDeducciones
                  ]?.text.replace(/\D/g, "");
                } else {
                  concepto =
                    arrayTextLine[i].arrayText[initDeducciones + 1]?.text;
                  conceptoCodigo =
                    arrayTextLine[i].arrayText[initDeducciones]?.text;
                  deduccion = arrayTextLine[i].arrayText[
                    initDeducciones + 2
                  ]?.text
                    .split("$")[1]
                    .trim();
                }

                if (concepto) {
                  elementDeducciones = {
                    conceptoCodigo,
                    concepto,
                    unidades: "N/A",
                    precio: "N/A",
                    deduccion,
                  };

                  client.deducciones.list.push(elementDeducciones);
                }
              }
            }
          }

          // MUESTREO TEMPORAL
          console.log(":::::::::::::::::::DEVENGOS:::::::::::::::::::");
          console.log(client.devengos);
          console.log(":::::::::::::::::::DEDUCCIONES:::::::::::::::::::");
          console.log(client.deducciones);

          // AÑADIENDO LOS RESULTADOS DE LOS OBJETOS
          resultObject = {
            client,
            company,
          };

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
