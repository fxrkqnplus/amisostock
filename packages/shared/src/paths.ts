const pathSeparator = String.fromCharCode(47);

export function basePath(path: string, publicBasePath: string): string {
  if (
    !path.startsWith(pathSeparator) ||
    path.startsWith(pathSeparator.repeat(2))
  ) {
    throw new TypeError('Application path must start with one slash');
  }
  if (
    publicBasePath !== '' &&
    (!publicBasePath.startsWith(pathSeparator) ||
      publicBasePath.startsWith(pathSeparator.repeat(2)))
  ) {
    throw new TypeError('Public base path must be empty or absolute');
  }
  const root = publicBasePath.replace(/\/+$/, '');
  return path === pathSeparator ? root || pathSeparator : `${root}${path}`;
}
