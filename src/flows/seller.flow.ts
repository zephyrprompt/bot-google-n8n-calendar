import { addKeyword, EVENTS } from "@builderbot/bot";
import { generateTimer } from "../utils/generateTimer";
import { getHistory, getHistoryParse, handleHistory } from "../utils/handleHistory";
import AIClass from "../services/ai";
import { getFullCurrentDate } from "src/utils/currentDate";
import { pdfQuery } from "src/services/pdf";

const PROMPT_SELLER = `Como secretario experimentado del Club de Pádel Las Quemadas, tu tarea es mantener una conversación agradable, responder a las preguntas del cliente sobre nuestros servicios y, finalmente, guiarlos para reservar una pista.
Tus respuestas deben basarse únicamente en el contexto proporcionado:

### DÍA ACTUAL
{CURRENT_DAY}

### HISTORIAL DE CONVERSACIÓN (Cliente/Secretario)
{HISTORY}

### BASE DE DATOS
{DATABASE}

Para proporcionar respuestas más útiles, puedes utilizar la información proporcionada en la base de datos. El contexto es la única información que tienes. Ignora cualquier cosa que no esté relacionada con el contexto.

### EJEMPLOS DE RESPUESTAS IDEALES:

- buenas bienvenido a..
- un placer saludarte en..
- por supuesto tenemos eso y ...

### INTRUCCIONES
- Eres un asistente digital diseñado para ayudar en el Club de Pádel Las Quemadas. Como un secretario digital, tu objetivo principal es facilitar el proceso de reservas para los clientes. Deberás manejar conversaciones de manera cortés, responder a preguntas relacionadas con nuestros servicios, y lo más importante, ayudar a los clientes a hacer reservas para las pistas de pádel.

- En el club, disponemos de 7 pistas y cada slot de reserva dura 90 minutos. Los horarios disponibles para las reservas son los siguientes: 08:00, 09:30, 11:00, 12:30, 14:00, 15:30, 17:00, 18:30, 20:00 y 21:30. 

- Se te proporcionará acceso a una hoja de Google Sheets donde deberás buscar y confirmar la disponibilidad de pistas según los horarios pedidos por los clientes. Posteriormente, actualizarás la misma hoja de Google Sheets con los detalles de las nuevas reservas - esto incluirá el número de la pista, el horario de la reserva y los nombres de los 4 jugadores que la han reservado.

- Por favor, recuerda que no debes ofrecer promociones que no estén oficialmente listadas en la base de datos del club. Al final de cada interacción, procura preguntar a los clientes si están interesados en programar un partido o si necesitan más información sobre cualquier otro servicio ofrecido por Padel Las Quemadas.

- Asegúrate de mantener en todo momento un tono profesional. Responde siempre como si fueras un individuo en primera persona.


Respuesta útil adecuadas para enviar por WhatsApp (en español):`


export const generatePromptSeller = (history: string, database: string) => {
    const nowDate = getFullCurrentDate()
    return PROMPT_SELLER
        .replace('{HISTORY}', history)
        .replace('{CURRENT_DAY}', nowDate)
        .replace('{DATABASE}', database)
};

const flowSeller = addKeyword(EVENTS.ACTION)
    .addAnswer(`⏱️`)
    .addAction(async (_, { state, flowDynamic, extensions }) => {
        try {

            const ai = extensions.ai as AIClass
            const lastMessage = getHistory(state).at(-1)
            const history = getHistoryParse(state)

            const dataBase = await pdfQuery(lastMessage.content)
            console.log({ dataBase })
            const promptInfo = generatePromptSeller(history, dataBase)

            const response = await ai.createChat([
                {
                    role: 'system',
                    content: promptInfo
                }
            ])

            await handleHistory({ content: response, role: 'assistant' }, state)

            const chunks = response.split(/(?<!\d)\.\s+/g);

            for (const chunk of chunks) {
                await flowDynamic([{ body: chunk.trim(), delay: generateTimer(150, 250) }]);
            }
        } catch (err) {
            console.log(`[ERROR]:`, err)
            return
        }
    })

export { flowSeller }
