import { query, closeDb } from '../src/services/db';
import { embed, loadDocs, KB_DIR } from '../src/services/rag';

const docs = await loadDocs(process.argv[2] ?? KB_DIR);
for (const d of docs) {
  await query('delete from kb_chunks where source = $1', [d.source]);
  for (const c of d.chunks) {
    const vec = await embed(`passage: ${c}`);
    await query('insert into kb_chunks (source, title, content, embedding) values ($1, $2, $3, $4::vector)', [d.source, d.title, c, `[${vec}]`]);
  }
  console.log(`${d.source}: ${d.chunks.length} chunks`);
}
await closeDb();
