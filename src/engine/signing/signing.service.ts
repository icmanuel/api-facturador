import { Injectable, Logger } from '@nestjs/common';
import * as forge from 'node-forge';
import * as crypto from 'crypto';
import { DOMParser } from '@xmldom/xmldom';
import { C14nCanonicalization } from 'xml-crypto';

const NS_DS = 'http://www.w3.org/2000/09/xmldsig#';
const NS_ETSI = 'http://uri.etsi.org/01903/v1.3.2#';

/**
 * Signs SRI XML documents using XAdES-BES enveloped signature.
 * Uses proper Inclusive C14N (via xml-crypto) for digest and signature computation.
 */
@Injectable()
export class SigningService {
  private readonly logger = new Logger(SigningService.name);
  private readonly c14n = new C14nCanonicalization();
  private readonly domParser = new DOMParser();

  sign(xml: string, p12Buffer: Buffer, password: string): string {
    const { privateKey, certificates } = this.extractFromP12(p12Buffer, password);
    const signingCert = certificates[0];

    // Unique IDs for signature elements
    const rid = this.randomId();
    const signatureId = `Signature${rid}`;
    const signedInfoId = `${signatureId}-SignedInfo`;
    const keyInfoId = `Certificate${rid}`;
    const signedPropertiesId = `${signatureId}-SignedProperties`;
    const referenceDocId = `Reference-ID-${rid}`;
    const objectId = `${signatureId}-Object`;

    // Ancestor namespaces inherited from <ds:Signature> — needed for C14N of child elements
    const ancestorNs = [
      { prefix: 'ds', namespaceURI: NS_DS },
      { prefix: 'etsi', namespaceURI: NS_ETSI },
    ];

    // Step 1: Build & C14N SignedProperties → digest
    const signedPropertiesXml = this.buildSignedProperties(
      signedPropertiesId, signatureId, signingCert, referenceDocId,
    );
    const signedPropertiesC14n = this.c14nFragment(signedPropertiesXml, ancestorNs);
    const signedPropertiesDigest = this.sha1Base64(signedPropertiesC14n);

    // Step 2: Build & C14N KeyInfo → digest
    const keyInfoXml = this.buildKeyInfo(keyInfoId, certificates, signingCert);
    const keyInfoC14n = this.c14nFragment(keyInfoXml, ancestorNs);
    const keyInfoDigest = this.sha1Base64(keyInfoC14n);

    // Step 3: C14N document content → digest (enveloped: Signature doesn't exist yet = no-op)
    const docC14n = this.c14nDoc(xml);
    const documentDigest = this.sha1Base64(docC14n);

    // Step 4: Build & C14N SignedInfo → RSA-SHA1 signature
    const signedInfoXml = this.buildSignedInfo(
      signedInfoId, referenceDocId, documentDigest,
      keyInfoId, keyInfoDigest,
      signedPropertiesId, signedPropertiesDigest,
    );
    const signedInfoC14n = this.c14nFragment(signedInfoXml, ancestorNs);
    const signatureValue = this.rsaSha1Sign(privateKey, signedInfoC14n);

    // Step 5: Assemble & insert
    const signatureXml = this.assembleSignature(
      signatureId, signedInfoXml, signatureValue,
      keyInfoXml, objectId, signedPropertiesXml,
    );

    return this.insertSignature(xml, signatureXml);
  }

  // ── XML builders ──

  private buildSignedProperties(
    signedPropertiesId: string,
    _signatureId: string,
    cert: forge.pki.Certificate,
    referenceDocId: string,
  ): string {
    const signingTime = new Date().toISOString();
    const certDigest = this.sha1Base64(this.certToDer(cert));
    const issuerName = this.formatIssuerName(cert.issuer);
    const serialNumber = this.getSerialNumber(cert);

    return (
      `<etsi:SignedProperties xmlns:etsi="${NS_ETSI}" xmlns:ds="${NS_DS}" Id="${signedPropertiesId}">` +
        `<etsi:SignedSignatureProperties>` +
          `<etsi:SigningTime>${signingTime}</etsi:SigningTime>` +
          `<etsi:SigningCertificate>` +
            `<etsi:Cert>` +
              `<etsi:CertDigest>` +
                `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>` +
                `<ds:DigestValue>${certDigest}</ds:DigestValue>` +
              `</etsi:CertDigest>` +
              `<etsi:IssuerSerial>` +
                `<ds:X509IssuerName>${issuerName}</ds:X509IssuerName>` +
                `<ds:X509SerialNumber>${serialNumber}</ds:X509SerialNumber>` +
              `</etsi:IssuerSerial>` +
            `</etsi:Cert>` +
          `</etsi:SigningCertificate>` +
        `</etsi:SignedSignatureProperties>` +
        `<etsi:SignedDataObjectProperties>` +
          `<etsi:DataObjectFormat ObjectReference="#${referenceDocId}">` +
            `<etsi:Description>contenido comprobante</etsi:Description>` +
            `<etsi:MimeType>text/xml</etsi:MimeType>` +
          `</etsi:DataObjectFormat>` +
        `</etsi:SignedDataObjectProperties>` +
      `</etsi:SignedProperties>`
    );
  }

  private buildKeyInfo(
    keyInfoId: string,
    certificates: forge.pki.Certificate[],
    signingCert: forge.pki.Certificate,
  ): string {
    const certElements = certificates
      .map((c) => `<ds:X509Certificate>${this.certToBase64(c)}</ds:X509Certificate>`)
      .join('');

    const pubKey = signingCert.publicKey as forge.pki.rsa.PublicKey;
    const modulus = Buffer.from(pubKey.n.toByteArray()).toString('base64');
    const exponent = Buffer.from(pubKey.e.toByteArray()).toString('base64');

    return (
      `<ds:KeyInfo xmlns:ds="${NS_DS}" Id="${keyInfoId}">` +
        `<ds:X509Data>` +
          certElements +
        `</ds:X509Data>` +
        `<ds:KeyValue>` +
          `<ds:RSAKeyValue>` +
            `<ds:Modulus>${modulus}</ds:Modulus>` +
            `<ds:Exponent>${exponent}</ds:Exponent>` +
          `</ds:RSAKeyValue>` +
        `</ds:KeyValue>` +
      `</ds:KeyInfo>`
    );
  }

  private buildSignedInfo(
    signedInfoId: string,
    referenceDocId: string, documentDigest: string,
    keyInfoId: string, keyInfoDigest: string,
    signedPropertiesId: string, signedPropertiesDigest: string,
  ): string {
    return (
      `<ds:SignedInfo xmlns:ds="${NS_DS}" xmlns:etsi="${NS_ETSI}" Id="${signedInfoId}">` +
        `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></ds:CanonicalizationMethod>` +
        `<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></ds:SignatureMethod>` +
        `<ds:Reference Id="SignedPropertiesID${this.randomId()}" Type="http://uri.etsi.org/01903#SignedProperties" URI="#${signedPropertiesId}">` +
          `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>` +
          `<ds:DigestValue>${signedPropertiesDigest}</ds:DigestValue>` +
        `</ds:Reference>` +
        `<ds:Reference URI="#${keyInfoId}">` +
          `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>` +
          `<ds:DigestValue>${keyInfoDigest}</ds:DigestValue>` +
        `</ds:Reference>` +
        `<ds:Reference Id="${referenceDocId}" URI="#comprobante">` +
          `<ds:Transforms>` +
            `<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></ds:Transform>` +
          `</ds:Transforms>` +
          `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>` +
          `<ds:DigestValue>${documentDigest}</ds:DigestValue>` +
        `</ds:Reference>` +
      `</ds:SignedInfo>`
    );
  }

  private assembleSignature(
    signatureId: string,
    signedInfoXml: string,
    signatureValue: string,
    keyInfoXml: string,
    objectId: string,
    signedPropertiesXml: string,
  ): string {
    const wrappedSigValue = signatureValue.match(/.{1,76}/g)?.join('\n') ?? signatureValue;

    // In the final Signature element, child elements inherit xmlns:ds and xmlns:etsi
    // from the parent. Remove redundant declarations from children.
    const cleanSignedInfo = signedInfoXml
      .replace(` xmlns:ds="${NS_DS}"`, '')
      .replace(` xmlns:etsi="${NS_ETSI}"`, '');
    const cleanKeyInfo = keyInfoXml
      .replace(` xmlns:ds="${NS_DS}"`, '');
    const cleanSignedProperties = signedPropertiesXml
      .replace(` xmlns:etsi="${NS_ETSI}"`, '')
      .replace(` xmlns:ds="${NS_DS}"`, '');

    return (
      `<ds:Signature xmlns:ds="${NS_DS}" xmlns:etsi="${NS_ETSI}" Id="${signatureId}">` +
        cleanSignedInfo +
        `<ds:SignatureValue>\n${wrappedSigValue}\n</ds:SignatureValue>` +
        cleanKeyInfo +
        `<ds:Object Id="${objectId}">` +
          `<etsi:QualifyingProperties Target="#${signatureId}">` +
            cleanSignedProperties +
          `</etsi:QualifyingProperties>` +
        `</ds:Object>` +
      `</ds:Signature>`
    );
  }

  private insertSignature(xml: string, signatureXml: string): string {
    const lastCloseTag = xml.lastIndexOf('</');
    if (lastCloseTag === -1) {
      throw new Error('Invalid XML: no closing tag found');
    }
    return xml.slice(0, lastCloseTag) + signatureXml + xml.slice(lastCloseTag);
  }

  // ── C14N helpers ──

  /**
   * Canonicalize an XML fragment with simulated ancestor namespaces.
   * This produces the same canonical form as if the fragment were embedded
   * inside <ds:Signature xmlns:ds="..." xmlns:etsi="...">.
   */
  private c14nFragment(
    xml: string,
    ancestorNamespaces: Array<{ prefix: string; namespaceURI: string }>,
  ): string {
    const doc = this.domParser.parseFromString(xml, 'text/xml');
    return this.c14n.process(doc.documentElement, { ancestorNamespaces });
  }

  /**
   * Canonicalize the full document (for the enveloped-signature document reference).
   */
  private c14nDoc(xml: string): string {
    const doc = this.domParser.parseFromString(xml, 'text/xml');
    return this.c14n.process(doc.documentElement, {});
  }

  // ── Crypto helpers ──

  private sha1Base64(data: string | Buffer): string {
    return crypto.createHash('sha1').update(data).digest('base64');
  }

  private rsaSha1Sign(privateKey: forge.pki.rsa.PrivateKey, data: string): string {
    const pem = forge.pki.privateKeyToPem(privateKey);
    const sign = crypto.createSign('RSA-SHA1');
    sign.update(data);
    return sign.sign(pem, 'base64');
  }

  // ── Certificate helpers ──

  private extractFromP12(p12Buffer: Buffer, password: string): {
    privateKey: forge.pki.rsa.PrivateKey;
    certificates: forge.pki.Certificate[];
  } {
    const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (!keyBag || keyBag.length === 0 || !keyBag[0].key) {
      throw new Error('No se encontró la clave privada en el certificado .p12');
    }
    const privateKey = keyBag[0].key as forge.pki.rsa.PrivateKey;

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];
    if (!certBag || certBag.length === 0) {
      throw new Error('No se encontró ningún certificado en el archivo .p12');
    }

    const certificates: forge.pki.Certificate[] = [];
    for (const bag of certBag) {
      if (bag.cert) {
        certificates.push(bag.cert);
      }
    }

    if (certificates.length === 0) {
      throw new Error('No se encontró ningún certificado válido en el archivo .p12');
    }

    // Signing cert first (matches private key), then CA chain
    const pubKeyN = privateKey.n.toString(16);
    certificates.sort((a, b) => {
      const aMatch = (a.publicKey as forge.pki.rsa.PublicKey).n.toString(16) === pubKeyN ? 0 : 1;
      const bMatch = (b.publicKey as forge.pki.rsa.PublicKey).n.toString(16) === pubKeyN ? 0 : 1;
      return aMatch - bMatch;
    });

    this.logger.debug(
      `P12: ${certificates.length} cert(s), signer: ${certificates[0].subject.getField('CN')?.value}`,
    );

    return { privateKey, certificates };
  }

  private certToDer(cert: forge.pki.Certificate): Buffer {
    const asn1 = forge.pki.certificateToAsn1(cert);
    const der = forge.asn1.toDer(asn1);
    return Buffer.from(der.getBytes(), 'binary');
  }

  private certToBase64(cert: forge.pki.Certificate): string {
    return this.certToDer(cert).toString('base64');
  }

  private formatIssuerName(issuer: forge.pki.Certificate['issuer']): string {
    const fields = issuer.attributes
      .slice()
      .reverse()
      .map((attr) => `${attr.shortName ?? attr.type}=${attr.value}`);
    return fields.join(',');
  }

  private getSerialNumber(cert: forge.pki.Certificate): string {
    return BigInt('0x' + cert.serialNumber).toString(10);
  }

  private randomId(): string {
    return String(Math.floor(Math.random() * 1_000_000));
  }
}
