import { petMessages, hasPhysicalRoleConfusion } from './petPrompt';
function check(value: boolean, message: string) { if (!value) throw new Error(message); }
const question = 'Como estoy fisicamente';
const messages = petMessages(question, 'Modo SIMULACIÓN. Números ficticios.');
check(messages[messages.length - 1].content === question, 'telemetry must not be folded into the user question');
check(messages[0].role === 'system' && messages[0].content.includes('SIMULACIÓN'), 'telemetry and identity belong in system context');
check(messages[2].role === 'assistant' && messages[2].content.includes('Tus datos'), 'example answers address the person');
check(hasPhysicalRoleConfusion('Estoy bien. Muevo mi cuerpo. No estoy en una crisis.'), 'reject observed first-person physical regression');
check(!hasPhysicalRoleConfusion('Estoy aquí para escucharte. Tus datos son simulados.'), 'preserve legitimate first-person assistant empathy');
console.log('petPrompt.check: ok');
