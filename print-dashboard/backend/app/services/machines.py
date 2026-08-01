# path: backend/app/services/machines.py
"""Priority 2 (Machine Management) service layer.

Machines advertise capabilities; Jobs (optionally) declare which capability
they need. Assignment is only allowed when the target machine's capability
set includes the job's required capability - this is what "compatible
machines only" means in practice, and what lets one machine substitute for
another that's unavailable, since the check is against the capability, not
a hardcoded machine_id.
"""

from ..models import Job, ProductionMachine

# Job statuses that count as "still occupying the machine" for workload
# purposes. Mirrors services/jobs.py's ACTIVE_STATUS/FINISHED_STATUS split -
# a finished or cancelled job no longer holds up the machine.
ACTIVE_JOB_STATUSES = {"in_session"}


class IncompatibleMachineError(ValueError):
    """Raised when a job is assigned to a machine that cannot perform the
    job's required capability."""


def machine_has_capability(machine, capability_id):
    if not capability_id:
        return True
    if machine is None:
        return False
    return any(cap.id == capability_id for cap in machine.capabilities)


def assert_machine_compatible(machine, required_capability_id):
    """Raises IncompatibleMachineError if the machine can't perform the
    job's required capability. No-op if the job has no required capability
    set (legacy jobs, or jobs not yet tied to a specific capability) or no
    machine is being assigned at all - compatibility only applies once both
    sides of the check actually exist.
    """
    if not required_capability_id or machine is None:
        return
    if not machine_has_capability(machine, required_capability_id):
        capability_names = ", ".join(sorted(cap.name for cap in machine.capabilities)) or "none"
        raise IncompatibleMachineError(
            f"{machine.name} cannot perform the required capability "
            f"(machine capabilities: {capability_names})"
        )


def compatible_machines(capability_id, only_available=False):
    query = ProductionMachine.query
    if only_available:
        query = query.filter(ProductionMachine.available.is_(True))
    machines = query.order_by(ProductionMachine.category.asc(), ProductionMachine.name.asc()).all()
    if not capability_id:
        return machines
    return [m for m in machines if machine_has_capability(m, capability_id)]


def auto_assign_machine(capability_id):
    """Build decision #5 ("if more than one machine could do the job,
    the app auto-picks one for you -- no manual override needed"):
    picks the single best machine for a capability rather than leaving
    that choice to whoever's filling in the form.

    "Best" = compatible AND currently available (skips machines down
    for maintenance/out of consumables), tie-broken by whichever has
    the fewest jobs currently active on it (machine_workload's
    active_job_count) -- an even spread across the fleet beats always
    defaulting to whichever machine happens to sort first
    alphabetically.

    Returns None if no compatible+available machine exists at all --
    callers should treat that as "leave machine_id unset, let a person
    sort it out" rather than a hard error; a job can still be created
    without a machine assigned.
    """
    candidates = compatible_machines(capability_id, only_available=True)
    if not candidates:
        return None
    return min(candidates, key=lambda m: machine_workload(m.id)["active_job_count"])


def machine_workload(machine_id):
    """Count of jobs currently occupying this machine (active status), plus
    the full active job list for surfacing in the UI. Queried live rather
    than cached on the model - workload changes every time a job's status
    or machine assignment changes, and a stored counter would drift the same
    way Sale.amount would without its own sync step.
    """
    jobs = (
        Job.query.filter(Job.machine_id == machine_id, Job.status.in_(ACTIVE_JOB_STATUSES))
        .order_by(Job.due_date.asc().nullslast())
        .all()
    )
    return {
        "active_job_count": len(jobs),
        "active_jobs": [
            {
                "id": job.id,
                "job_ref": job.job_ref,
                "title": job.title,
                "client_name": job.client_name,
                "status": job.status,
                "due_date": job.due_date.isoformat() if job.due_date else None,
            }
            for job in jobs
        ],
    }


def serialize_machine(machine, include_workload=True):
    data = machine.to_dict()
    data["capabilities"] = [cap.to_dict() for cap in machine.capabilities]
    if include_workload:
        data.update(machine_workload(machine.id))
    return data
