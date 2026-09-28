/**
 * Project Milestones for TenderGuard
 * Defines deliverable gates, token allocations, and verification states.
 */
export const initialMilestones = {
  T001: [
    {
      id: 'M1',
      tenderId: 'T001',
      title: 'Site Preparation & Demolition',
      amount: 30,
      currency: 'MSTC',
      status: 'RELEASED',
      dueDate: '2026-11-01',
      completedDate: '2026-10-28',
      txHash: '0x1a8f9c20194827dbf820c78a19d20c3829471b83e0192837461928374619b401',
      txHashShort: '0x1a8f...b401',
      verifiedBy: 'Chief Municipal Engineer',
      description: 'Clearing old structures, hazardous material abatement, and perimeter safety installation.'
    },
    {
      id: 'M2',
      tenderId: 'T001',
      title: 'Structural Reinforcement & Foundation',
      amount: 20,
      currency: 'MSTC',
      status: 'IN_PROGRESS',
      dueDate: '2026-12-15',
      completedDate: null,
      txHash: null,
      txHashShort: null,
      verifiedBy: null,
      description: 'Foundation retrofitting, seismic column reinforcement, and structural load testing.'
    },
    {
      id: 'M3',
      tenderId: 'T001',
      title: 'Final Completion & Commissioning',
      amount: 50,
      currency: 'MSTC',
      status: 'PENDING',
      dueDate: '2027-02-01',
      completedDate: null,
      txHash: null,
      txHashShort: null,
      verifiedBy: null,
      description: 'Interior fit-out, electrical grid integration, safety audit, and civic handover.'
    }
  ],
  T002: [
    {
      id: 'M1',
      tenderId: 'T002',
      title: 'Geotechnical Survey & Utility Marking',
      amount: 25,
      currency: 'MSTC',
      status: 'PENDING',
      dueDate: '2026-11-15',
      completedDate: null,
      txHash: null,
      txHashShort: null,
      verifiedBy: null,
      description: 'Subsurface radar mapping, utility conduit alignment, and traffic diversion layout.'
    },
    {
      id: 'M2',
      tenderId: 'T002',
      title: 'Drainage Culverts & Subgrade Works',
      amount: 35,
      currency: 'MSTC',
      status: 'PENDING',
      dueDate: '2027-01-10',
      completedDate: null,
      txHash: null,
      txHashShort: null,
      verifiedBy: null,
      description: 'Pre-cast concrete storm drainage channels and subgrade stabilization layer.'
    },
    {
      id: 'M3',
      tenderId: 'T002',
      title: 'Smart Sensor Grid & Bituminous Paving',
      amount: 40,
      currency: 'MSTC',
      status: 'PENDING',
      dueDate: '2027-03-30',
      completedDate: null,
      txHash: null,
      txHashShort: null,
      verifiedBy: null,
      description: 'Asphalt paving, IoT vehicle flow sensors, and adaptive street lighting grid.'
    }
  ]
};
