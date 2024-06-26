export class Experiment {
  constructor(
    public id: string,
    public startDate: string,
    public endDate: string,
    public instrumentId: number,
    public proposalId: number
  ) {}
}

export class Instrument {
  constructor(
    public id: number,
    public name: string,
    public shortCode: string
  ) {}
}

export class Proposal {
  constructor(
    public id: number,
    public identifier: string,
    public publicAt: string,
    public summary: string,
    public title: string
  ) {}
}

export class Role {
  constructor(
    public id: number,
    public description: string,
    public name: string
  ) {}
}

export class UserRole {
  constructor(
    public userId: number,
    public roleId: number
  ) {}
}

export class User {
  constructor(
    public id: string,
    public activatedAt: string,
    public email: string,
    public firstName: string,
    public lastName: string,
    public instanceQuota: string,
    public lastSeenAt: string,
    public affiliationId: number
  ) {}
}

export class Employer {
  constructor(
    public id: number,
    public countryCode: string,
    public name: string,
    public town: string
  ) {}
}

export class ExperimentUser {
  constructor(
    public experimentId: string,
    public userId: string
  ) {}
}
