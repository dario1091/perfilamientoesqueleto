var path = require("path");
// const fs = require("fs");
const { documentExtract } = require("../utils.js");


const getTextDevDed = (text) => {
    let ret = "";
    if (text.includes("$")) {
        ret = text.split("$").pop().trim();
    } else {
        ret = text;
    }
    return ret;
}


const getNominaWithoutText = (text) => {
    // text = "15/ene/2022";
    let month = "";
    let nomina = "";

    if (text.includes("/")) {
        month = text.split("/")[1];
    } else {
        month = text.split("-")[1];
    }

    if (month.toUpperCase().startsWith("ENE")) nomina = text.replace(month, "01");
    if (month.toUpperCase().startsWith("FEB")) nomina = text.replace(month, "02");
    if (month.toUpperCase().startsWith("MAR")) nomina = text.replace(month, "03");
    if (month.toUpperCase().startsWith("ABR")) nomina = text.replace(month, "04");
    if (month.toUpperCase().startsWith("MAY")) nomina = text.replace(month, "05");
    if (month.toUpperCase().startsWith("JUN")) nomina = text.replace(month, "06");
    if (month.toUpperCase().startsWith("JUL")) nomina = text.replace(month, "07");
    if (month.toUpperCase().startsWith("AGO")) nomina = text.replace(month, "08");
    if (month.toUpperCase().startsWith("SEP")) nomina = text.replace(month, "09");
    if (month.toUpperCase().startsWith("OCT")) nomina = text.replace(month, "10");
    if (month.toUpperCase().startsWith("NOV")) nomina = text.replace(month, "11");
    if (month.toUpperCase().startsWith("DIC")) nomina = text.replace(month, "12");

    if (nomina === "") {
        nomina = "NO REGISTRA";
    }
    // console.log("NOMINA: " + nomina)
    return nomina;
}

const readPaymentgSupport = (filePath, isRequest = false) =>
    new Promise((resolve, reject) => {
        try {
            let ext = path.extname(filePath);

            let arrayTextLine = [];

            /**
             * Json de resultado
             */
            let resultObject = {};

            let resultArr = [];

            /**
             * Left de devengos
             */
            let leftAccrual = 0;

            /**
             * Left de descuentos
             */
            let leftDeductions = 0;

            let contConfidence = 0;
            // let contConfidence2 = 0;
            let totalDatos = 0;
            // let totalDatos2 = 0;

            let client = {
                name: "",
                banco: {
                    name: "",
                    account: "",
                },
                cargo: "",
                salud: "NO REGISTRA",
                basico: "",
                nomina: "",
                pension: "NO REGISTRA",
                convenio: "NO REGISTRA",
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
                salud: "NO REGISTRA",
                pension: "NO REGISTRA",
                convenio: "NO REGISTRA",
                fechaIngreso: "NO REGISTRA",
                banco: {},
                devengos: {
                    list: [],
                },
                deducciones: {
                    list: [],
                },
            };

            let company2 = { nit: "" };

            let contDesprendibles = 0;

            /**
            * Lee 2 facturas con fechas distintas en un mismo documento
            */
            let dobleDesprendible = false;

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
                                    arrayTextLine[pos]?.arrayText.push({
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

                                // #################################################### fin if
                            }
                        }
                        // ################################################## fin for
                    }

                    dobleDesprendible = contDesprendibles === 2 ? true : false;
                    console.log("\n----------------------------------------------------------\n")
                    console.log("Doble desprendible? : " + dobleDesprendible)
                    /**
                     * Posición inicial de tabla de dev/ded
                     */
                    let init = arrayTextLine
                        .map((e) => {
                            if (e.arrayText[2]?.text.toUpperCase().includes("DEVENGADO")) {
                                return e.arrayText[2]?.text.toUpperCase();
                            } else if (e.arrayText[3]?.text.toUpperCase().includes("DEVENGADO")) {
                                return e.arrayText[3]?.text.toUpperCase();
                            } else if (e.arrayText[1]?.text.toUpperCase().includes("DEVENGADO")) {
                                return e.arrayText[1]?.text.toUpperCase();
                            } else if (e.arrayText[4]?.text.toUpperCase().includes("DEVENGADO")) {
                                return e.arrayText[4]?.text.toUpperCase();
                            } else if (e.arrayText[0]?.text.toUpperCase().includes("DEVENGADO")) {
                                return e.arrayText[0]?.text.toUpperCase();
                            }
                        })
                        .indexOf("DEVENGADO");

                    console.log("Comienzo tabla 1: " + init);

                    /**
                     * Posición final de tabla de dev/ded y campo
                     * de subtotales devengos y deducciones
                     */
                    let end = arrayTextLine
                        .map((e) => {
                            if (e.arrayText[0]?.text.toUpperCase().includes("TOTALES")) {
                                return e.arrayText[0]?.text;
                            } else if (e.arrayText[1]?.text.toUpperCase().includes("TOTALES")) {
                                return e.arrayText[1]?.text;
                            }
                        })
                        .indexOf("TOTALES");

                    console.log("Fin tabla 1: " + end);

                    // Referencias de inicio y fin de recorrido de la tabla para segundo desprendible
                    // unica imagen
                    // let init2;
                    // let end2;


                    // if (dobleDesprendible) {
                    //     init2 = dobleDesprendible
                    //         ? arrayTextLine
                    //             .map((e) => {
                    //                 if (e.arrayText[0]?.top > 0.6) {
                    //                     return e.arrayText[0]?.text;
                    //                 }
                    //             })
                    //             .indexOf("o autorizados)")
                    //         : 0;
                    //     end2 = dobleDesprendible
                    //         ? arrayTextLine
                    //             .map((e) => {
                    //                 if (e.arrayText[0]?.top > 0.6) {
                    //                     return e.arrayText[0]?.text;
                    //                 }
                    //             })
                    //             .indexOf("TOTALES:")
                    //         : 0;
                    // }

                    // console.log("Comienzo tabla 2: " + init2);
                    // console.log("Fin tabla 2: " + end2);

                    /**
                     *  Coordenadas top del documento
                     */
                    let top;


                    // Referencias top para diferenciar una tabla de la otra
                    // let topRefPrimeraTabla;
                    // // let topRefSegTabla;
                    // try {
                    //     topRefPrimeraTabla = arrayTextLine[end]?.arrayText[0]?.top;
                    //     // dobleDesprendible && (topRefSegTabla = arrayTextLine[end2]?.arrayText[0]?.top)
                    // } catch (error) {
                    //     console.log("Error controlado al guardar referencias top del documento");
                    //     console.log(error);
                    // }

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
                        // Referencia bloque adelante
                        let block = i + 1;
                        // let columna = 0;

                        arrayTextLine[i]?.arrayText.map((x) => {
                            if (x.top.includes(":::")) {
                                top = x.top.split(":::")[1];
                            } else {
                                top = x.top;
                            }

                            // CAPTURA DE NOMINA
                            try {
                                if (x.text.toUpperCase().startsWith("COMPROBANTE")) {
                                    console.log("COMPROBANTE DE NOMINA")
                                    // NOMINA SAME LINE NIT
                                    if (arrayTextLine[block].arrayText[0]?.text.toUpperCase().includes("NIT")) {
                                        // console.log("JOIN 1 - LINE NIT")
                                        // let textNomina = arrayTextLine[block].arrayText[2] ?
                                        //     arrayTextLine[block].arrayText[2]?.text.split(" ").pop().trim() :
                                        //     arrayTextLine[block].arrayText[1]?.text.split(" ").pop().trim();
                                        let textNomina = arrayTextLine[block].arrayText.slice(-1).pop().text.split(" ").pop().trim();
                                        console.log(textNomina)
                                        if (textNomina.includes("-")) {
                                            if (isNaN(parseInt(textNomina.split("-")[1]))) {
                                                // console.log("JOIN 1 - 1")
                                                client.nomina = getNominaWithoutText(textNomina);
                                            } else {
                                                // console.log("JOIN 1 - 2")
                                                client.nomina = textNomina
                                            }
                                        } else if (textNomina.includes("/")) {
                                            if (isNaN(parseInt(textNomina.split("/")[1]))) {
                                                // console.log("JOIN 1 - 1")
                                                client.nomina = getNominaWithoutText(textNomina);
                                            } else {
                                                // console.log("JOIN 1 - 2")
                                                client.nomina = textNomina
                                            }
                                        }

                                    } else {
                                        // SAME LINE CONSIGNADO
                                        if (arrayTextLine[block].arrayText[0]?.text.toUpperCase().includes("CONSIGNADO")) {
                                            // console.log("JOIN 2 - LINE CONSIGNADO")
                                            if (arrayTextLine[block].arrayText[1]) {
                                                // console.log("JOIN 2 - 1")
                                                let textNomina = arrayTextLine[block].arrayText[2] ?
                                                    arrayTextLine[block].arrayText[2]?.text.split(" ").pop().trim() :
                                                    arrayTextLine[block].arrayText[1]?.text.split(" ").pop().trim();
                                                if (textNomina.includes("-")) {
                                                    if (isNaN(parseInt(textNomina.split("-")[1]))) {
                                                        // console.log("JOIN 2 - 2")
                                                        client.nomina = getNominaWithoutText(textNomina);
                                                    } else {
                                                        // console.log("JOIN 2 - 3")
                                                        client.nomina = textNomina
                                                    }
                                                } else if (textNomina.includes("/")) {
                                                    if (isNaN(parseInt(textNomina.split("/")[1]))) {
                                                        // console.log("JOIN 2 / 2")
                                                        client.nomina = getNominaWithoutText(textNomina);
                                                    } else {
                                                        // console.log("JOIN 2 / 3")
                                                        client.nomina = textNomina
                                                    }
                                                }
                                            }
                                            // NEXT LINE TO CONSIGNADO
                                        } else if (arrayTextLine[block + 1].arrayText[0]?.text.toUpperCase().includes("CONSIGNADO")) {
                                            // console.log("JOIN 3 - LINE NEXT TO CONSIGNADO")
                                            if (arrayTextLine[block + 1].arrayText[1]) {
                                                // console.log("JOIN 3 - 1")
                                                // ultima fecha separada
                                                let textNomina = arrayTextLine[block + 1].arrayText[2] ?
                                                    arrayTextLine[block + 1].arrayText[2]?.text.split(" ").pop().trim() :
                                                    arrayTextLine[block + 1].arrayText[1]?.text.split(" ").pop().trim();
                                                // NOTE: Code alternative
                                                // let textNomina = arrayTextLine[block + 1].arrayText.slice(-1).pop().text;
                                                if (textNomina.includes("-")) {
                                                    if (isNaN(parseInt(textNomina.split("-")[1]))) {
                                                        // console.log("JOIN 3 - 2")
                                                        client.nomina = getNominaWithoutText(textNomina);
                                                    } else {
                                                        // console.log("JOIN 3 - 3")
                                                        client.nomina = textNomina
                                                    }
                                                } else if (textNomina.includes("/")) {
                                                    // console.log(textNomina)
                                                    if (isNaN(parseInt(textNomina.split("/")[1]))) {
                                                        // console.log("JOIN 3 / 2")
                                                        client.nomina = getNominaWithoutText(textNomina);
                                                    } else {
                                                        // console.log("JOIN 3 / 3")
                                                        client.nomina = textNomina
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de nomina");
                                console.log(error);
                            }

                            // CAPTURA DATOS BASICOS CLIENTE
                            try {
                                if (x.text.includes("Identificación") || x.text.includes("Nombres") || x.text.includes("Sueldo Básico")) {
                                    if (arrayTextLine[block]?.arrayText[2]) {
                                        // console.log("BASICS 1")
                                        client.documentNumber = arrayTextLine[block]?.arrayText[0]?.text?.split(".").join("");
                                        client.name = arrayTextLine[block]?.arrayText[1]?.text;
                                        client.basico = arrayTextLine[block]?.arrayText[2]?.text?.split("$").pop().trim();
                                    } else {
                                        // console.log("BASICS 2")
                                        // console.log(arrayTextLine[block])
                                        client.documentNumber = arrayTextLine[block]?.arrayText[0]?.text?.split(".").join("");
                                        if (arrayTextLine[block]?.arrayText[1]) {
                                            client.name = arrayTextLine[block]?.arrayText[1]?.text;
                                            client.basico = arrayTextLine[block + 1]?.arrayText[0]?.text?.split("$").pop().trim();
                                        } else {
                                            client.name = arrayTextLine[block + 1]?.arrayText[0]?.text?.split("$").pop().trim();
                                            client.basico = arrayTextLine[block + 1]?.arrayText[1]?.text?.split("$").pop().trim();
                                        }
                                    }
                                    // console.log(arrayTextLine[block + 1]);
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de nombre cliente");
                                console.log(error);
                            }

                            // CAPTURA CARGO
                            try {
                                if (x.text.toUpperCase().startsWith("CARGO")) {
                                    // console.log("Header")
                                    // console.log(arrayTextLine[i])
                                    // console.log("Next header")
                                    // console.log(arrayTextLine[block])
                                    // console.log("NEXT NEXT HEADER")
                                    // console.log(arrayTextLine[block + 1])
                                    // console.log("BACK HEADER")
                                    // console.log(arrayTextLine[i - 1])
                                    if (arrayTextLine[block]?.arrayText[1]) {
                                        // console.log("JOIN CARGO 1")
                                        // console.log(arrayTextLine[block])
                                        client.cargo = arrayTextLine[block]?.arrayText[1]?.text;
                                    } else if (arrayTextLine[block + 1]?.arrayText[1]) {
                                        // console.log("JOIN CARGO 2")
                                        client.cargo = arrayTextLine[block + 1]?.arrayText[1]?.text;
                                    }
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de cargo cliente");
                                console.log(error);
                            }

                            // CAPTURA BANCO
                            try {
                                if (x.text.toUpperCase().startsWith("CONSIGNADO EN")) {
                                    // console.log("---------------ENTRA--------------")
                                    // console.log(x.text)
                                    if (x.text.includes(":")) {
                                        client.banco.name = x.text.split(":")[1].trim();
                                    } else {
                                        client.banco.name = x.text.split(" ").slice(2).join(" ");
                                    }
                                }
                                if (x.text.toUpperCase().includes("CUENTA NO")) {
                                    // console.log("CAPTURANDO CUENTA \n")
                                    // console.log(arrayTextLine[i]?.arrayText[1]?.text)
                                    if (!isNaN(parseInt(arrayTextLine[i]?.arrayText[1]?.text.replace(/\D/g, "")))) {
                                        client.banco.account = arrayTextLine[i]?.arrayText[1]?.text.replace(/\D/g, "");
                                    } else if (x.text.includes(":")) {
                                        client.banco.account = x.text.split(":").pop().trim();
                                    } else {
                                        client.banco.account = x.text.split(" ").pop().trim();
                                    }
                                }

                            } catch (error) {
                                console.log("Error controlado en captura de banco");
                                console.log(error);
                            }

                            // Calculo de puntuacion de confiabilidad de lectura del documento
                            try {
                                contConfidence += x.confidence;
                                totalDatos++;
                                client.confidence = (contConfidence / totalDatos).toFixed(2);
                                client2.confidence = (contConfidence / totalDatos).toFixed(2);
                            } catch (error) {
                                console.log("Error controlado en captura de confiabilidad del documento");
                                console.log(error);
                            }

                            // CAPTURA SUELDO NETO
                            try {
                                if (x.text.toUpperCase().includes("MCTE") || x.text.includes("***")) {
                                    if (arrayTextLine[i]?.arrayText[2] && arrayTextLine[i]?.arrayText[2]?.text.includes("$")) {
                                        client.sueldoNeto = arrayTextLine[i]?.arrayText[2]?.text.split("$")[1].trim();
                                    } else if (arrayTextLine[i]?.arrayText[1] && arrayTextLine[i]?.arrayText[1]?.text.includes("$")) {
                                        client.sueldoNeto = arrayTextLine[i]?.arrayText[1]?.text.split("$")[1].trim();
                                    } else {
                                        client.sueldoNeto = arrayTextLine[block]?.arrayText[0]?.text.split("$")[1].trim()
                                    }
                                    // console.log("NETO")
                                    // console.log(arrayTextLine[i])
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de sueldo neto");
                                console.log(error);
                            }


                            // CAPTURA DATOS EMPRESA
                            try {
                                let leftNit;
                                if (x.text.toUpperCase().startsWith("NIT")) {
                                    leftNit = x.left;
                                    // console.log((arrayTextLine[i - 2]?.arrayText[0]?.left - 0.03).toFixed(2) < leftNit)
                                    // console.log(leftNit)
                                    // console.log(((parseFloat(arrayTextLine[i - 2]?.arrayText[0]?.left) + 0.03).toString()))
                                    // Get name company
                                    if (arrayTextLine[i - 2] &&
                                        ((arrayTextLine[i - 2]?.arrayText[0]?.left - 0.03).toFixed(2) <= leftNit) &&
                                        (((parseFloat(arrayTextLine[i - 2]?.arrayText[0]?.left) + 0.03).toString()) >= leftNit)) {
                                        company.name = arrayTextLine[i - 2]?.arrayText[0]?.text;
                                    } else {
                                        company.name = arrayTextLine[i - 1]?.arrayText[0]?.text;
                                    }

                                    // Get nit company
                                    if (isNaN(parseInt(x.text.replace(/\D/g, "")))) {
                                        company.nit = arrayTextLine[i]?.arrayText[1]?.text;
                                    } else {
                                        company.nit = x.text.replace(/\D/g, "")
                                    }
                                }
                            } catch (error) {
                                console.log("Error controlado en captura de nombre de la empresa");
                                console.log(error);
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

                    let elementDevengos2 = {};
                    let elementDeducciones2 = {};
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

                    // SI NO HAY DATOS EN LA TABLA 1 o 2
                    if (init + 1 === end) {
                        client.devengos.confidence = "0";
                        client.deducciones.confidence = "0";
                    }

                    if (dobleDesprendible) {
                        if (init2 + 1 === end2) {
                            client2.devengos.confidence = "0";
                            client2.deducciones.confidence = "0";
                        }
                    }

                    let confidenceDevengo = 0;
                    // let confidenceDevengo2 = 0;
                    let totalDatosDevengo = 0;
                    // let totalDatosDevengo2 = 0;
                    let confidenceDeduccion = 0;
                    // let confidenceDeduccion2 = 0;
                    let totalDatosDeduccion = 0;
                    // let totalDatosDeduccion2 = 0;


                    // CAPTURA DE SUBTOTALES DEVENGO Y DEDUCCION
                    try {

                        if (arrayTextLine[end]?.arrayText[0]?.text.toUpperCase().startsWith("FIRMA")) {
                            // console.log("JOIN1 SUB")
                            if (arrayTextLine[end]?.arrayText[3]) {
                                client.devengos.subtotal = arrayTextLine[end]?.arrayText[2]?.text.split("$").pop().trim();
                                client.deducciones.subtotal = arrayTextLine[end]?.arrayText[3]?.text.split("$").pop().trim();
                            } else {
                                // console.log("SUBTOTALES EN OTRA LINEA");
                                if (arrayTextLine[end]?.arrayText[2]) {
                                    if (arrayTextLine[end + 1]?.arrayText[0]?.text.includes("$")) {
                                        client.devengos.subtotal = arrayTextLine[end]?.arrayText[2]?.text.split("$").pop().trim();
                                        client.deducciones.subtotal = arrayTextLine[end + 1]?.arrayText[0]?.text.split("$").pop().trim();
                                    }
                                } else {
                                    client.devengos.subtotal = arrayTextLine[end + 1]?.arrayText[0]?.text.split("$").pop().trim();
                                    client.deducciones.subtotal = arrayTextLine[end + 1]?.arrayText[1]?.text.split("$").pop().trim();

                                }
                            }
                        } else if (arrayTextLine[end]?.arrayText[0]?.text.toUpperCase().startsWith("TOTALES")) {
                            // console.log("JOIN2 SUB")
                            // console.log(arrayTextLine[end+1])
                            if (arrayTextLine[end]?.arrayText[2]) {
                                // console.log("hay 2")
                                client.devengos.subtotal = arrayTextLine[end]?.arrayText[1]?.text.split("$").pop().trim();
                                client.deducciones.subtotal = arrayTextLine[end]?.arrayText[2]?.text.split("$").pop().trim();
                            } else {
                                // console.log("SUBTOTALES EN OTRA LINEA");
                                if (arrayTextLine[end]?.arrayText[1]) {
                                    if (arrayTextLine[end + 1]?.arrayText[0]?.text.includes("$")) {
                                        client.devengos.subtotal = arrayTextLine[end]?.arrayText[1]?.text.split("$").pop().trim();
                                        client.deducciones.subtotal = arrayTextLine[end + 1]?.arrayText[0]?.text.split("$").pop().trim();
                                    }
                                } else {
                                    client.devengos.subtotal = arrayTextLine[end + 1]?.arrayText[0]?.text.split("$").pop().trim();
                                    client.deducciones.subtotal = arrayTextLine[end + 1]?.arrayText[1]?.text.split("$").pop().trim();
                                }
                            }
                        }
                    } catch (error) {
                        console.log("Error controlado en captura de subtotales");
                        console.log(error);
                    }

                    console.log("-------------------------------------------- HEADER COLUMNS")
                    console.log(arrayTextLine[init])

                    console.log("-------------------------------------------- LEFT REFERENCES")
                    let leftAmount;

                    // if (arrayTextLine[init]?.arrayText[0]?.text.toUpperCase().includes("DESCRIPCION CONCEPTO") ||
                    //     arrayTextLine[init]?.arrayText[0]?.text.toUpperCase().includes("DESCRIPCIÓN CONCEPTO")) {
                    //     leftAmount = (arrayTextLine[init]?.arrayText[1]?.left);
                    // } else if (arrayTextLine[init]?.arrayText[1]?.text.toUpperCase().includes("DESCRIPCION CONCEPTO") ||
                    //     arrayTextLine[init]?.arrayText[1]?.text.toUpperCase().includes("DESCRIPCIÓN CONCEPTO")) {
                    //     leftAmount = (arrayTextLine[init]?.arrayText[2]?.left);
                    // } else {
                    //     leftAmount = (arrayTextLine[init]?.arrayText[2]?.text.toUpperCase().startsWith("CANT") ?
                    //         arrayTextLine[init]?.arrayText[2]?.left : arrayTextLine[init]?.arrayText[1]?.left
                    //     )
                    // }

                    if (arrayTextLine[init]?.arrayText[0]?.text.toUpperCase().startsWith("CANT")) {
                        leftAmount = arrayTextLine[init]?.arrayText[0]?.left;
                    } else if (arrayTextLine[init]?.arrayText[1]?.text.toUpperCase().startsWith("CANT")) {
                        leftAmount = arrayTextLine[init]?.arrayText[1]?.left;
                    } else if (arrayTextLine[init]?.arrayText[2]?.text.toUpperCase().startsWith("CANT")) {
                        leftAmount = arrayTextLine[init]?.arrayText[2]?.left;
                    } else if (arrayTextLine[init]?.arrayText[3]?.text.toUpperCase().startsWith("CANT")) {
                        leftAmount = arrayTextLine[init]?.arrayText[3]?.left;
                    } else if (arrayTextLine[init]?.arrayText[4]?.text.toUpperCase().startsWith("CANT")) {
                        leftAmount = arrayTextLine[init]?.arrayText[4]?.left;
                    }

                    // console.log(arrayTextLine[init])
                    console.log('leftAmount', leftAmount);

                    let isTurnToLeft = false;
                    let isTurnToRight = false;
                    if (arrayTextLine[init]?.arrayText[1]?.text.toUpperCase().includes("DEVENGADO")) {
                        leftAccrual = (arrayTextLine[init]?.arrayText[1]?.left - 0.03).toFixed(2);
                    } else if (arrayTextLine[init]?.arrayText[2]?.text.toUpperCase().includes("DEVENGADO")) {
                        leftAccrual = (arrayTextLine[init]?.arrayText[2]?.left - 0.03).toFixed(2);
                    } else if (arrayTextLine[init]?.arrayText[3]?.text.toUpperCase().includes("DEVENGADO")) {
                        console.log("JOIN HERE")
                        leftAccrual = (arrayTextLine[init]?.arrayText[3]?.left - 0.03).toFixed(2);
                    } else if (arrayTextLine[init]?.arrayText[4]?.text.toUpperCase().includes("DEVENGADO")) {
                        leftAccrual = (arrayTextLine[init]?.arrayText[4]?.left - 0.03).toFixed(2);
                    } else if (arrayTextLine[init + 1]?.arrayText[0]?.text.toUpperCase().includes("DEVENGADO")) {
                        leftAccrual = (arrayTextLine[init + 1]?.arrayText[0]?.left - 0.03).toFixed(2);
                    } else {
                        leftAccrual = (arrayTextLine[init - 1]?.arrayText[0]?.left - 0.03).toFixed(2);
                    }
                    console.log('leftAccrual: ', leftAccrual)

                    if (arrayTextLine[init]?.arrayText[2]?.text.toUpperCase().includes("DEDUCIDO")) {
                        // console.log("join5")
                        leftDeductions = (arrayTextLine[init]?.arrayText[2]?.left - 0.03).toFixed(2);
                    } else if (arrayTextLine[init]?.arrayText[3]?.text.toUpperCase().includes("DEDUCIDO")) {
                        // console.log("join")
                        leftDeductions = (arrayTextLine[init]?.arrayText[3]?.left - 0.03).toFixed(2);
                    } else if (arrayTextLine[init]?.arrayText[4]?.text.toUpperCase().includes("DEDUCIDO")) {
                        // console.log("join1")
                        leftDeductions = (arrayTextLine[init]?.arrayText[4]?.left - 0.03).toFixed(2);
                    } else if (arrayTextLine[init]?.arrayText[5]?.text.toUpperCase().includes("DEDUCIDO")) {
                        // console.log("join4")
                        leftDeductions = (arrayTextLine[init]?.arrayText[5]?.left - 0.03).toFixed(2);
                    } else if (arrayTextLine[init + 1]?.arrayText[0]?.text.toUpperCase().includes("DEDUCIDO")) {
                        // console.log("join2")
                        isTurnToLeft = true;
                        leftDeductions = (arrayTextLine[init + 1]?.arrayText[0]?.left - 0.03).toFixed(2);
                    } else {
                        // console.log("join3")
                        isTurnToRight = true;
                        leftDeductions = (arrayTextLine[init - 1]?.arrayText[0]?.left - 0.03).toFixed(2);
                    }

                    if (leftDeductions < 0.50) {
                        leftDeductions = 1 - leftDeductions;
                    }
                    console.log('leftDeductions', leftDeductions)

                    let leftSaldo;
                    if (arrayTextLine[init]?.arrayText[4]?.text.toUpperCase().startsWith("SALD")) {
                        leftSaldo = arrayTextLine[init]?.arrayText[4]?.left;
                    } else if (arrayTextLine[init]?.arrayText[5]?.text.toUpperCase().startsWith("SALD")) {
                        leftSaldo = arrayTextLine[init]?.arrayText[5]?.left;
                    } else if (arrayTextLine[init]?.arrayText[6]?.text.toUpperCase().startsWith("SALD")) {
                        leftSaldo = arrayTextLine[init]?.arrayText[6]?.left;
                    }


                    /**
                    * special case
                    */
                    let avanzoHidden;

                    // RECORRIDO DE TABLA
                    for (let i = init + 1; i < end; i++) {
                        arrayTextLine[i].arrayText.map(x => {
                            let conceptoCodigo = "N/A";
                            let concepto = "";
                            let unidades = "";
                            let precio = "N/A";
                            let devengo = "";
                            let deduccion = "";

                            if (x.left < leftAmount) {
                                // console.log(arrayTextLine[i]?.arrayText[0])
                                // Case text too long
                                if (!arrayTextLine[i + 1]?.arrayText[1] && arrayTextLine[i + 1]?.arrayText[1]?.left < leftAmount) {
                                    concepto = arrayTextLine[i]?.arrayText[0]?.text
                                        .concat(arrayTextLine[i + 1]?.arrayText[0]?.text);
                                }
                                // Case code + text
                                else if (isNaN(parseInt(x.text.replace(/\D/g, "")))) {
                                    concepto = x?.text
                                }
                                // Case just text
                                else {
                                    concepto = x?.text.replace(/[\d]+/g, "").trim();
                                    conceptoCodigo = x?.text.replace(/\D/g, "");
                                }

                                let elementConcepto = { concepto }
                                let elementConceptoCodigo = { conceptoCodigo }
                                let elementPrecio = { precio };
                                elementDevengos = Object.assign({}, elementConceptoCodigo, elementConcepto, elementPrecio)
                                elementDeducciones = Object.assign({}, elementConceptoCodigo, elementConcepto, elementPrecio)
                            }

                            if (x.left >= leftAmount && x.left < leftAccrual) {
                                // console.log(x)
                                if (arrayTextLine[i]?.arrayText[0]?.left >= leftAmount && arrayTextLine[i]?.arrayText[0]?.left < leftAccrual) {
                                    unidades = arrayTextLine[i]?.arrayText[0]?.text;
                                } else if (arrayTextLine[i]?.arrayText[1]?.left >= leftAccrual) {
                                    // console.log(x.text)
                                    unidades = arrayTextLine[i]?.arrayText[1]?.text;
                                } else {
                                    unidades = x.text;
                                }
                                // unidades = arrayTextLine[i]?.arrayText[1]?.left >= leftAccrual ? "0" : x.text;
                                // console.log(arrayTextLine[i])
                                elementDevengos.unidades = unidades;
                                elementDeducciones.unidades = unidades;
                            } else if (!elementDevengos.unidades && !elementDeducciones.unidades) {
                                elementDevengos.unidades = "0";
                                elementDeducciones.unidades = "0";
                            }

                            // devengos
                            if (x.left >= leftAccrual && x.left < leftDeductions) {
                                let textDevengo = getTextDevDed(x.text);
                                if (!isNaN(parseInt(textDevengo.replace(/\D/g, "")))) {
                                    devengo = getTextDevDed(x.text);
                                    elementDevengos.devengo = devengo;
                                }
                            }

                            // deducciones
                            if (leftSaldo) {
                                // console.log("JOIN1")
                                if (x.left >= leftDeductions && x.left < leftSaldo) {
                                    let textDeduccion = getTextDevDed(x.text);
                                    if (!isNaN(parseInt(textDeduccion.replace(/\D/g, "")))) {
                                        deduccion = getTextDevDed(x.text);
                                        elementDeducciones.deduccion = deduccion
                                    }
                                }
                            } else {
                                // console.log("JOIN2")
                                if (x.left >= leftDeductions) {
                                    let textDeduccion = getTextDevDed(x.text);
                                    if (!isNaN(parseInt(textDeduccion.replace(/\D/g, "")))) {
                                        deduccion = getTextDevDed(x.text);
                                        elementDeducciones.deduccion = deduccion
                                    }
                                }
                            }

                            if (devengo) {
                                confidenceDevengo += x.confidence;
                                totalDatosDevengo++;
                                // console.log(elementDevengos)
                                client.devengos.list.push(elementDevengos);
                                client.devengos.confidence = (
                                    confidenceDevengo / totalDatosDevengo
                                ).toFixed(2);
                            }

                            if (x.text.toUpperCase().includes("AVANZO")) {
                                avanzoHidden = x.text;
                            }

                            if (deduccion) {
                                confidenceDeduccion += x.confidence;
                                totalDatosDeduccion++;
                                // console.log(elementDeducciones)
                                client.deducciones.list.push(elementDeducciones);
                                client.deducciones.confidence = (
                                    confidenceDeduccion / totalDatosDeduccion
                                ).toFixed(2);
                            }

                            // console.log("ELEMENT DEVENGOS")
                            // console.log(elementDevengos)
                            // console.log("ELEMENT DEDUCCIONES")
                            // console.log(elementDeducciones)

                        })
                    }

                    client.deducciones.list.map(x => {
                        client.devengos.list.map(y => {
                            if (x.concepto === y.concepto) {
                                if (avanzoHidden) {
                                    x.concepto = avanzoHidden;
                                }
                            }
                        })
                    })

                    // MUESTREO TEMPORAL
                    console.log(":::::::::::::::::::DEVENGOS 1:::::::::::::::::::");
                    console.log(client.devengos);
                    console.log(":::::::::::::::::::DEDUCCIONES 1:::::::::::::::::::");
                    console.log(client.deducciones);

                    if (dobleDesprendible) {
                        console.log(":::::::::::::::::::DEVENGOS 2:::::::::::::::::::");
                        console.log(client2.devengos);
                        console.log(":::::::::::::::::::DEDUCCIONES 2:::::::::::::::::::");
                        console.log(client2.deducciones);
                    }

                    if (dobleDesprendible) {
                        resultObject = { client, company, client2, company2 };
                        resultArr.push({ client: resultObject.client, company: resultObject.company })
                        resultArr.push({ client: resultObject.client2, company: resultObject.company2 })
                    } else {
                        resultObject = { client, company };
                        resultArr.push(resultObject)
                    }

                    console.log(resultObject)
                    // arrayTextLine.map(x => { console.log(x) })

                    jsonToRead ? resolve(resultArr) : resolve(false);
                })();
            }
        } catch (error) {
            console.log("ERROR");
            console.log(error);
            resolve(false);
        }
    });

module.exports = { readPaymentgSupport };
