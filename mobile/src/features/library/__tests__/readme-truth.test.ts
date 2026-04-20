import fs from 'node:fs';
import path from 'node:path';

describe('mobile README truth', () => {
  it('describes async storage MVP instead of WatermelonDB', () => {
    const readme = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
    expect(readme).toContain('AsyncStorage');
    expect(readme).not.toContain('WatermelonDB');
  });
});
