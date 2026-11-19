import { Quaternion, Vector3 } from 'three';

function palm(shoulder) {
  const points = shoulder.children[0].geometry.attributes.position;
  return new Vector3().fromBufferAttribute(points, points.count - 1);
}

// Point on the intersection of the two reach spheres, toward the camera.
function meetingPoint(a, b, ra, rb) {
  const axis = b.clone().sub(a);
  const distance = axis.length();
  axis.divideScalar(distance);
  const along = (ra*ra - rb*rb + distance*distance) / (2*distance);
  const forward = new Vector3(0,-.22,1);
  forward.addScaledVector(axis,-forward.dot(axis)).normalize();
  return a.clone().addScaledVector(axis,along)
    .addScaledVector(forward,Math.sqrt(Math.max(0,ra*ra-along*along)));
}

function aim(shoulder, tip, direction, amount) {
  const rotation = new Quaternion().setFromUnitVectors(tip.clone().normalize(),direction.normalize());
  shoulder.quaternion.identity().slerp(rotation,amount);
}

export function poseHandoff(view, reach, receive, collect, release) {
  const giver = view.bu.arms[0], receiver = view.yi.arms[1], support = view.yi.arms[0];
  const dg = palm(giver), dr = palm(receiver), ds = palm(support);
  const g = giver.getWorldPosition(new Vector3()), r = receiver.getWorldPosition(new Vector3());
  const s = support.getWorldPosition(new Vector3());
  const geometry = view.gift.geometry;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  // Seat the two opposing star points slightly inside the rounded pads.
  const half = geometry.boundingBox.max.x - .023;
  const span = new Vector3(2*half,0,0);
  const shared = meetingPoint(g,r.clone().add(span),dg.length(),dr.length());
  const cradle = meetingPoint(r,s.clone().add(span),dr.length(),ds.length());
  const receiveDirection = shared.clone().sub(span).sub(r).normalize()
    .lerp(cradle.clone().sub(r).normalize(),collect);
  aim(giver,dg,shared.clone().sub(g),reach*(1-release));
  aim(receiver,dr,receiveDirection,receive);
  aim(support,ds,cradle.clone().sub(span).sub(s),collect);
  const taking = collect > 0 || release > 0;
  const angle = Math.PI*collect;
  const held = taking ? receiver.localToWorld(dr.clone()) : giver.localToWorld(dg.clone());
  const offset = new Vector3(taking ? half : -half,-.056,-.028);
  offset.applyAxisAngle(new Vector3(0,0,1),angle);
  view.gift.position.copy(view.gift.parent.worldToLocal(held.add(offset)));
  view.gift.rotation.set(0,0,angle);
}
