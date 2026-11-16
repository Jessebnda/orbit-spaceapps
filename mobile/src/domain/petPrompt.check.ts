import { petMessages, hasPhysicalRoleConfusion } from './petPrompt';
function check(value: boolean, message: string) { if (!value) throw new Error(message); }
const question = 'Como estoy fisicamente';
const messages = petMessages(question, 'Datos simulados. Pulso 72 lpm.', [{ from: 'me', text: 'Dormí mal' }, { from: 'pet', text: 'Lo siento.' }]);
check(messages[messages.length - 1].content === question, 'telemetry must not be folded into the user question');
check(messages[0].role === 'system' && messages[0].content.includes('Pulso 72'), 'telemetry and identity belong in system context');
check(messages[2].role === 'assistant' && messages[2].content.includes('contigo'), 'example keeps assistant and person distinct');
check(messages[3].content === 'Dormí mal' && messages[4].role === 'assistant', 'prior chat turns are kept in order');
const noData = petMessages('¿Cómo estoy físicamente?', 'Sin datos.');
check(!/ritmo cardiaco|sueño|dentro de rango|saludable/i.test(noData[2].content), 'example must not seed unsupported medical findings when telemetry is absent');
const demo = petMessages(question, 'Datos simulados. Pulso 72 lpm.');
check(demo[0].content.includes('no las presentes como evidencia de su salud real'), 'simulation must not be treated as evidence of real health');
check(!demo[0].content.includes('ya lo sabe'), 'do not assume the person already knows the limitation');
check(!demo[0].content.includes('nunca te niegues'), 'do not impose an unrestricted compliance instruction');
check(hasPhysicalRoleConfusion('Estoy bien. Muevo mi cuerpo. No estoy en una crisis.'), 'reject observed first-person physical regression');
check(!hasPhysicalRoleConfusion('Estoy aquí para escucharte. Tus datos son simulados.'), 'preserve legitimate first-person assistant empathy');
const echo = { from: 'pet' as const, text: 'Estoy aquí para escucharte.' };
const looped = petMessages('Huevos', 'Sin datos.', [{ from: 'me', text: 'Hola' }, echo, { from: 'me', text: 'Todo' }, echo]);
check(!looped.some((m) => m.role === 'assistant' && m.content === echo.text), 'a repeated reply is dropped from the history');
check(!looped[0].content.includes('estoy aquí para escucharte'), 'the system prompt gives no stock phrase to copy');
console.log('petPrompt.check: ok');

const contaminated = petMessages('¿Y ahora?', 'Sin datos.', [{ from: 'me', text: 'Me duele mi cuerpo' }, { from: 'pet', text: 'Estoy bien, muevo mi cuerpo.' }]);
check(contaminated.some(m => m.content === 'Me duele mi cuerpo'), "keep the user’s own first-person description");
check(!contaminated.some(m => m.role === 'assistant' && m.content.includes('muevo mi cuerpo')), 'do not prime the model with its old role-confused answers');
