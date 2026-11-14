import { petMessages, hasPhysicalRoleConfusion } from './petPrompt';
function check(value: boolean, message: string) { if (!value) throw new Error(message); }
const question = 'Como estoy fisicamente';
const messages = petMessages(question, 'Datos simulados. Pulso 72 lpm.', [{ from: 'me', text: 'Dormí mal' }, { from: 'pet', text: 'Lo siento.' }]);
check(messages[messages.length - 1].content === question, 'telemetry must not be folded into the user question');
check(messages[0].role === 'system' && messages[0].content.includes('Pulso 72'), 'telemetry and identity belong in system context');
check(messages[2].role === 'assistant' && /\bTu\b/.test(messages[2].content), 'example answers address the person');
check(messages[3].content === 'Dormí mal' && messages[4].role === 'assistant', 'prior chat turns are kept in order');
check(!/simulaci/i.test(messages[2].content), 'example must not prime the simulation disclaimer');
check(hasPhysicalRoleConfusion('Estoy bien. Muevo mi cuerpo. No estoy en una crisis.'), 'reject observed first-person physical regression');
check(!hasPhysicalRoleConfusion('Estoy aquí para escucharte. Tus datos son simulados.'), 'preserve legitimate first-person assistant empathy');
console.log('petPrompt.check: ok');
