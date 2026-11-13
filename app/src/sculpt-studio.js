import * as THREE from 'three';
// Neutral review setup. Colourful narrative lighting is not a colour standard.
export function addSculptLights(scene,legacy=false){
 scene.add(new THREE.HemisphereLight('#ffffff',legacy?'#b6a99b':'#b8b8b8',legacy?2.2:1.35));
 const key=new THREE.DirectionalLight(legacy?'#fff5e9':'#ffffff',legacy?2.3:2.6);key.position.set(-3,5,5);scene.add(key);
 const fill=new THREE.DirectionalLight(legacy?'#f2f5ff':'#ffffff',legacy?1.1:.65);fill.position.set(3,2,3);scene.add(fill);
 const rim=new THREE.DirectionalLight('#ffffff',legacy?1:.5);rim.position.set(-2,3,-4);scene.add(rim);
 return key;
}
