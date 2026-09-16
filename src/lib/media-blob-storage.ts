import Dexie from 'dexie';

const blobFields = { mediaBlobs: 'blob', importJobs: 'originalFile' } as const;

/** Some WebKit stores reject native Blob values. Store bytes without changing the public table API. */
export function installMediaBlobStorage(database: Dexie): void {
  database.use({
    stack: 'dbcore',
    name: 'media-blob-bytes',
    level: 0,
    create(downstream) {
      return {
        ...downstream,
        table(name) {
          const table = downstream.table(name);
          const field = blobFields[name as keyof typeof blobFields];
          if (!field) return table;
          return {
            ...table,
            mutate(request) {
              if (request.type !== 'add' && request.type !== 'put') return table.mutate(request);
              if (
                !request.values.some(
                  (row) => row?.[field] instanceof Blob || (row?._mediaBlobEncoding === 1 && row[field] == null),
                )
              )
                return table.mutate(request);
              // Keep the native transaction alive while asynchronously reading Blob bytes.
              return Dexie.waitFor(
                Promise.all(
                  request.values.map(async (row) => {
                    if (row?._mediaBlobEncoding === 1 && row[field] == null) {
                      const { _mediaBlobEncoding, _mediaBlobType, ...publicRow } = row;
                      return publicRow;
                    }
                    if (!(row?.[field] instanceof Blob)) return row;
                    return {
                      ...row,
                      [field]: await row[field].arrayBuffer(),
                      _mediaBlobEncoding: 1,
                      _mediaBlobType: row[field].type,
                    };
                  }),
                ),
              ).then((values) => table.mutate({ ...request, values }));
            },
          };
        },
      };
    },
  });
  for (const [name, field] of Object.entries(blobFields)) {
    database.table(name).hook('reading', (row) => {
      if (!row || row._mediaBlobEncoding !== 1) return row;
      if (!(row[field] instanceof ArrayBuffer)) throw new Error('Stored file bytes are invalid');
      const { _mediaBlobEncoding, _mediaBlobType, ...publicRow } = row;
      return { ...publicRow, [field]: new Blob([row[field]], { type: _mediaBlobType ?? row.mimeType ?? '' }) };
    });
  }
}
