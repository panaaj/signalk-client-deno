/*
 * UUID: A js library to generate and parse UUIDs, TimeUUIDs and generate
 * TimeUUID based on dates for range selections.
 * @see http://www.ietf.org/rfc/rfc4122.txt
 **/
export class UUID {
  private limitUI04;
  private limitUI06;
  private limitUI08;
  private limitUI12;
  private limitUI14;
  private limitUI16;
  private limitUI32;
  private limitUI40;
  private limitUI48;

  private version = 4;
  private hex = '';

  constructor() {
    this.limitUI04 = this.maxFromBits(4);
    this.limitUI06 = this.maxFromBits(6);
    this.limitUI08 = this.maxFromBits(8);
    this.limitUI12 = this.maxFromBits(12);
    this.limitUI14 = this.maxFromBits(14);
    this.limitUI16 = this.maxFromBits(16);
    this.limitUI32 = this.maxFromBits(32);
    this.limitUI40 = this.maxFromBits(40);
    this.limitUI48 = this.maxFromBits(48);

    this.create();
  }

  toString() {
    return this.hex;
  }
  toURN() {
    return 'urn:uuid:' + this.hex;
  }
  toSignalK(): string {
    return `urn:mrn:signalk:uuid:${this.hex}`;
  }
  toBytes() {
    const parts = this.hex.split('-');
    const ints: number[] = [];
    let intPos = 0;
    for (let i = 0; i < parts.length; i++) {
      for (let j = 0; j < parts[i].length; j += 2) {
        ints[intPos++] = parseInt(parts[i].substring(j, 2), 16);
      }
    }
    return ints;
  }

  private maxFromBits(bits: number) {
    return Math.pow(2, bits);
  }

  private getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomUI04() {
    return this.getRandomInt(0, this.limitUI04 - 1);
  }
  private randomUI06() {
    return this.getRandomInt(0, this.limitUI06 - 1);
  }
  private randomUI08() {
    return this.getRandomInt(0, this.limitUI08 - 1);
  }
  private randomUI12() {
    return this.getRandomInt(0, this.limitUI12 - 1);
  }
  private randomUI14() {
    return this.getRandomInt(0, this.limitUI14 - 1);
  }
  private randomUI16() {
    return this.getRandomInt(0, this.limitUI16 - 1);
  }
  private randomUI32() {
    return this.getRandomInt(0, this.limitUI32 - 1);
  }
  private randomUI40() {
    return (
      (0 | (Math.random() * (1 << 30))) +
      (0 | (Math.random() * (1 << (40 - 30)))) * (1 << 30)
    );
  }
  private randomUI48() {
    return (
      (0 | (Math.random() * (1 << 30))) +
      (0 | (Math.random() * (1 << (48 - 30)))) * (1 << 30)
    );
  }

  private create() {
    this.fromParts(
      this.randomUI32(),
      this.randomUI16(),
      0x4000 | this.randomUI12(),
      0x80 | this.randomUI06(),
      this.randomUI08(),
      this.randomUI48(),
    );
  }

  private paddedString(string: string, length: number, z?: string) {
    string = String(string);
    z = !z ? '0' : z;
    let i = length - string.length;
    for (; i > 0; i >>>= 1, z += z) {
      if (i & 1) {
        string = z + string;
      }
    }
    return string;
  }

  private fromParts(
    timeLow: number,
    timeMid: number,
    timeHiAndVersion: number,
    clockSeqHiAndReserved: number,
    clockSeqLow: number,
    node: number,
  ) {
    this.version = (timeHiAndVersion >> 12) & 0xf;
    this.hex = this.paddedString(timeLow.toString(16), 8) +
      '-' +
      this.paddedString(timeMid.toString(16), 4) +
      '-' +
      this.paddedString(timeHiAndVersion.toString(16), 4) +
      '-' +
      this.paddedString(clockSeqHiAndReserved.toString(16), 2) +
      this.paddedString(clockSeqLow.toString(16), 2) +
      '-' +
      this.paddedString(node.toString(16), 12);
    return this;
  }
}
