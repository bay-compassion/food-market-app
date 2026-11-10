// Makes the certificate that signs every release of the app: a self-signed code-signing
// certificate, good for twenty years, as a password-protected `.p12`. Run it once.
//
//   node signing/make-certificate.ts <folder outside the repository>
//
// It writes three files there: `certificate.p12`; `certificate.p12.base64`, the same file as the
// `APP_SIGNING_CERTIFICATE` secret wants it; and `certificate-password.txt`. Keep all three in the
// team's password manager, never in the repository, and put the base64 and the password in the
// repository's secrets (see the README's "Signing").
//
// macOS installs an update only if it is signed by the certificate that signed the copy already
// installed, so this certificate is permanent: a new one means replacing every installed copy by
// hand, once. Losing it means the same.

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** What `SIGNING_IDENTITY` names in the release workflow. */
const certificateName = 'Compassion Food Market Releases';

const destination = process.argv[2];

if (!destination) {
	throw new Error('Usage: node signing/make-certificate.ts <folder outside the repository>');
}

const output = path.resolve(destination);
const p12 = path.join(output, 'certificate.p12');

if (existsSync(p12)) {
	throw new Error(`${p12} already exists; this certificate is meant to be made once`);
}

// macOS's own LibreSSL, not a Homebrew OpenSSL 3: a `.p12` OpenSSL 3 exports by default is encrypted
// in a way `security import` can't read.
const openssl = '/usr/bin/openssl';
const work = mkdtempSync(path.join(tmpdir(), 'signing-'));

try {
	const config = path.join(work, 'certificate.cnf');
	const key = path.join(work, 'key.pem');
	const certificate = path.join(work, 'certificate.pem');
	const password = randomBytes(24).toString('base64url');

	writeFileSync(
		config,
		[
			'[req]',
			'distinguished_name = dn',
			'x509_extensions = ext',
			'prompt = no',
			'[dn]',
			`CN = ${certificateName}`,
			'O = The Bay Compassion',
			'[ext]',
			'basicConstraints = critical,CA:false',
			'keyUsage = critical,digitalSignature',
			'extendedKeyUsage = critical,codeSigning',
			'',
		].join('\n'),
	);
	execFileSync(
		openssl,
		[
			'req',
			'-x509',
			'-newkey',
			'rsa:3072',
			'-nodes',
			'-keyout',
			key,
			'-out',
			certificate,
			'-days',
			String(20 * 365),
			'-config',
			config,
		],
		// openssl reports its progress on stderr; only a failure matters here.
		{ stdio: ['ignore', 'ignore', 'pipe'] },
	);

	mkdirSync(output, { recursive: true, mode: 0o700 });
	execFileSync(openssl, [
		'pkcs12',
		'-export',
		'-inkey',
		key,
		'-in',
		certificate,
		'-name',
		certificateName,
		'-out',
		p12,
		'-passout',
		`pass:${password}`,
	]);
	chmodSync(p12, 0o600);
	writeFileSync(`${p12}.base64`, readFileSync(p12).toString('base64'), { mode: 0o600 });
	writeFileSync(path.join(output, 'certificate-password.txt'), password, { mode: 0o600 });

	const fingerprint = execFileSync(
		openssl,
		['x509', '-noout', '-fingerprint', '-sha1', '-in', certificate],
		{
			encoding: 'utf8',
		},
	).trim();

	console.log(`Wrote the certificate "${certificateName}" to ${output}\n${fingerprint}`);
} finally {
	rmSync(work, { recursive: true, force: true });
}
