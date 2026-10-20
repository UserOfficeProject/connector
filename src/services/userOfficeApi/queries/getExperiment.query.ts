export const GET_EXPERIMENT_QUERY = `query getExperiment($experimentPk: Int!) {
  experiment(experimentPk: $experimentPk) {
    ...experiment
    proposal {
      ...proposal
      proposer {
        ...basicUserDetails
      }
    }
    visit {
      registrations {
        status
        user {
          ...basicUserDetails
        }
      }
    }
    experimentSafety {
      ...experimentSafety
    }
  }
}

fragment experiment on Experiment {
  experimentPk
  experimentId
  startsAt
  endsAt
  scheduledEventId
  proposalPk
  status
  localContactId
  localContact {
    ...basicUserDetails
  }
  instrumentId
  createdAt
  updatedAt
  instrument {
    id
    name
    shortCode
    description
    managerUserId
    scientists {
      ...basicUserDetails
    }
  }
}

fragment basicUserDetails on BasicUserDetails {
  id
  firstname
  lastname
  preferredname
  institution
  institutionId
  created
  email
  country
  oidcSub
}

fragment proposal on Proposal {
  primaryKey
  title
  abstract
  statusId
  status {
    ...status
  }
  publicStatus
  proposalId
  finalStatus
  commentForUser
  commentForManagement
  created
  updated
  callId
  questionaryId
  notified
  submitted
  managementDecisionSubmitted
  fileId
}

fragment status on Status {
  id
  name
  description
  isDefault
  entityType
}

fragment experimentSafety on ExperimentSafety {
  experimentSafetyPk
  experimentPk
  esiQuestionaryId
  esiQuestionarySubmittedAt
  createdBy
  statusId
  safetyReviewQuestionaryId
  reviewedBy
  createdAt
  updatedAt
  instrumentScientistDecision
  instrumentScientistComment
  experimentSafetyReviewerDecision
  experimentSafetyReviewerComment
  status {
    ...status
  }
  samples {
    experimentPk
    sampleId
    isEsiSubmitted
    sampleEsiQuestionaryId
    createdAt
    updatedAt
    questionary {
      ...questionary
    }
    sample {
      ...sample
    }
  }
}

fragment questionary on Questionary {
  questionaryId
  templateId
  created
  steps {
    ...questionaryStep
  }
}

fragment questionaryStep on QuestionaryStep {
  topic {
    ...topic
  }
  isCompleted
  fields {
    ...answer
  }
}

fragment topic on Topic {
  title
  id
  templateId
  sortOrder
  isEnabled
}

fragment answer on Answer {
  answerId
  question {
    ...question
  }
  sortOrder
  topicId
  config {
    ...fieldConfig
  }
  dependencies {
    questionId
    dependencyId
    dependencyNaturalKey
    condition {
      ...fieldCondition
    }
  }
  dependenciesOperator
  value
}

fragment question on Question {
  id
  question
  naturalKey
  dataType
  categoryId
  config {
    ...fieldConfig
  }
}

fragment fieldConfig on FieldConfig {
  ... on BooleanConfig {
    small_label
    required
    tooltip
    readPermissions
  }
  ... on DateConfig {
    small_label
    required
    tooltip
    readPermissions
    minDate
    maxDate
    defaultDate
    includeTime
  }
  ... on EmbellishmentConfig {
    html
    plain
    omitFromPdf
    readPermissions
  }
  ... on FileUploadConfig {
    file_type
    max_files
    pdf_page_limit
    omitFromPdf
    small_label
    required
    tooltip
    readPermissions
  }
  ... on IntervalConfig {
    units {
      ...unit
    }
    numberValueConstraint
    small_label
    required
    tooltip
    readPermissions
  }
  ... on NumberInputConfig {
    units {
      ...unit
    }
    numberValueConstraint
    small_label
    required
    tooltip
    readPermissions
  }
  ... on ProposalBasisConfig {
    tooltip
    readPermissions
  }
  ... on ProposalEsiBasisConfig {
    tooltip
    readPermissions
  }
  ... on SampleEsiBasisConfig {
    tooltip
    readPermissions
  }
  ... on SampleBasisConfig {
    titlePlaceholder
    readPermissions
  }
  ... on SampleDeclarationConfig {
    addEntryButtonLabel
    minEntries
    maxEntries
    templateId
    esiTemplateId
    templateCategory
    required
    small_label
    readPermissions
  }
  ... on SubTemplateConfig {
    addEntryButtonLabel
    copyButtonLabel
    canCopy
    isMultipleCopySelect
    isCompleteOnCopy
    minEntries
    maxEntries
    templateId
    templateCategory
    required
    small_label
    readPermissions
  }
  ... on SelectionFromOptionsConfig {
    variant
    options
    isMultipleSelect
    small_label
    required
    tooltip
    readPermissions
  }
  ... on TextInputConfig {
    min
    max
    multiline
    placeholder
    small_label
    required
    tooltip
    readPermissions
    htmlQuestion
    isHtmlQuestion
    isCounterHidden
  }
  ... on ShipmentBasisConfig {
    small_label
    required
    tooltip
    readPermissions
  }
  ... on RichTextInputConfig {
    small_label
    required
    tooltip
    readPermissions
    max
    allowImages
  }
  ... on DynamicMultipleChoiceConfig {
    small_label
    required
    tooltip
    readPermissions
    url
    jsonPath
    apiCallRequestHeaders {
      name
      value
    }
    isMultipleSelect
    variant
  }
  ... on VisitBasisConfig {
    small_label
    required
    tooltip
    readPermissions
  }
  ... on FapReviewBasisConfig {
    small_label
    required
    tooltip
    readPermissions
    minGrade
    maxGrade
    decimalPoints
    nonNumericOptions
  }
  ... on TechnicalReviewBasisConfig {
    small_label
    required
    tooltip
    readPermissions
  }
  ... on GenericTemplateBasisConfig {
    titlePlaceholder
    questionLabel
    readPermissions
  }
  ... on FeedbackBasisConfig {
    small_label
    required
    tooltip
    readPermissions
  }
  ... on ExperimentSafetyReviewBasisConfig {
    small_label
    required
    tooltip
    readPermissions
  }
  ... on InstrumentPickerConfig {
    variant
    small_label
    required
    tooltip
    readPermissions
    isMultipleSelect
    requestTime
    instruments {
      id
      name
    }
  }
  ... on TechniquePickerConfig {
    variant
    small_label
    required
    tooltip
    readPermissions
    isMultipleSelect
    techniques {
      id
      name
    }
  }
}

fragment unit on Unit {
  id
  unit
  quantity
  symbol
  siConversionFormula
}

fragment fieldCondition on FieldCondition {
  condition
  params
}

fragment sample on Sample {
  id
  title
  creatorId
  questionaryId
  safetyStatus
  safetyComment
  isPostProposalSubmission
  created
  proposalPk
  questionId
}
`;
