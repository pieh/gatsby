import { danger } from "danger"

interface ApiError {
  action: string
  opts: object
  error: any
}

export const logApiError = ({ action, opts, error }: ApiError) => {
  const msg = `Could not run ${action} with options ${JSON.stringify(
    opts
  )}\n Error was ${error}\nSet env var DEBUG=octokit:rest* for extended logging info.`
  console.warn(msg)
}

const triageNeededLabel = "status: triage needed"

export const applyStatusTriageNeededLabel = async () => {
  const gh = danger.github as any
  const repo = gh.repository
  const issue = gh.issue
  
  if (!danger.github.issue.labels.some(label => label.name === triageNeededLabel) {
   const opts = {
      owner: repo.owner.login,
      repo: repo.name,
      number: issue.number,
      labels: [triageNeededLabel],
    }
    
    try {
      await danger.github.api.issues.addLabels(opts)
    } catch (error) {
      logApiError({ action: `issues.addLabel`, opts, error })
    }
  }
}

export default async () => {
  await applyStatusTriageNeededLabel()
}
