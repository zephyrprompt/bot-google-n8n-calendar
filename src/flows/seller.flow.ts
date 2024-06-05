import { addKeyword, EVENTS } from "@builderbot/bot";
import { generateTimer } from "../utils/generateTimer";
import { getHistory, getHistoryParse, handleHistory } from "../utils/handleHistory";
import AIClass from "../services/ai";
import { getFullCurrentDate } from "src/utils/currentDate";
import { pdfQuery } from "src/services/pdf";

const PROMPT_SELLER = `Como secretario experimentado del Club de Pádel Las Quemadas, tu tarea es mantener una conversación agradable, responder a las preguntas del cliente sobre nuestros servicios y, finalmente, guiarlos para reservar una pista de pádel y añadir los datos posteriormente a google calendar, con la siguiente estructura: número de pista, horario de reserva y jugadores que la conforman. Tus respuestas deben basarse únicamente en el contexto proporcionado:

### DÍA ACTUAL
{CURRENT_DAY}

### HISTORIAL DE CONVERSACIÓN (Cliente/Vendedor)
{HISTORY}

### BASE DE DATOS
{DATABASE}

Para proporcionar respuestas más útiles, puedes utilizar la información proporcionada en la base de datos. El contexto es la única información que tienes. Ignora cualquier cosa que no esté relacionada con el contexto.

### EJEMPLOS DE RESPUESTAS IDEALES:

- buenas bienvenido a..
- un placer saludarte en..
- por supuesto tenemos eso y ...

### INTRUCCIONES
- Ten en cuenta que hay 7 pistas, siendo que se pueden reservar cada 90 minutos, a las siguientes horas: 08:00, 09:30, 11:00, 12:30, 14:00, 15:30, 17:00, 18:30, 20:00 y 21:00. Debes acceder a Google Calendar tanto para deducir las pistas que están libres según la hora deseada por el cliente, como para posteriormente añadir la información de las reservas que gestiones, con la siguiente estructura: número de pista, horario de reserva y los 4 jugadores que la conforman.
- Mantén un tono profesional y siempre responde en primera persona..
- NO ofrezcas promociones que no existe en la BASE DE DATOS
- Finaliza la conversacion con CTA ¿Te gustaría jugar un partido? ¿Quieres información de algún otro servicio en Padel Las Quemadas?
- Continua la conversacion sin saludar en primera persona.
- Debes preguntar el nombre de los 4 jugadores que conforman la reserva, informarles del número pista que se reserva (pista1,2,etc) y está libre para, posteriormente, añadir esos datos en la reserva de Google Calendar.

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
